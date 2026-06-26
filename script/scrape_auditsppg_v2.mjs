/**
 * Scrape all SPPG in Aceh from auditsppg.id
 * 
 * Strategy:
 * 1. Extract 254 kecamatan slugs from map page HTML (already cached)
 * 2. Scrape each kecamatan listing page → collect all SPPG names + URLs
 * 3. Scrape each detail page → collect geoCtx data
 * 4. Output CSV with full data
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'https://auditsppg.id';
const DELAY_MS = 500;
const CONCURRENCY = 3; // parallel requests (not too many to avoid rate limiting)
const CACHE_DIR = '/tmp/auditsppg_cache';

// Ensure cache dir
import { mkdirSync } from 'fs';
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// ── Step 0: Extract kecamatan slugs from cached map page ──
function extractKecamatanSlugs() {
  const html = readFileSync('/tmp/peta.html', 'utf-8');
  // Find kecamatanRows
  const match = html.match(/var kecamatanRows = (\[.*?\]);/);
  if (!match) throw new Error('kecamatanRows not found in map page');
  const data = JSON.parse(match[1]);
  // Filter Aceh
  const aceh = data
    .map(d => d.Sppg)
    .filter(d => d.provinsi_slug === 'aceh');
  
  console.log(`Found ${aceh.length} kecamatan in Aceh`);
  return aceh.map(d => ({
    kecamatan: d.kecamatan,
    slug: d.kecamatan_slug,
    kab_kota: d.kab_kota,
    slug_kota: d.slug_kota,
  }));
}

// ── Step 1: Scrape kecamatan page ──
async function fetchWithCache(url, cacheKey) {
  const cachePath = `${CACHE_DIR}/${cacheKey}.html`;
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf-8');
  }
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const html = await resp.text();
  writeFileSync(cachePath, html, 'utf-8');
  return html;
}

function parseSppgFromListing(html, kecamatanInfo) {
  const results = [];
  
  // Extract SPPG names and URLs from the listing
  // Pattern: href="/sppg/sppg-{slug}" with SPPG name in text
  
  // Find all SPPG card links
  const linkRegex = /<a[^>]*href="(\/sppg\/sppg-[^"]+)"[^>]*>[\s\S]*?SPPG\s+([^<]+?)<\/[^>]+>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].trim();
    results.push({ url, name, ...kecamatanInfo });
  }
  
  // Alternative: extract from structured data (JSON-LD)
  const ldMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const graph = ld['@graph'] || [];
      for (const item of graph) {
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          for (const el of item.itemListElement) {
            if (el.item && el.item.name && el.item.url) {
              const name = el.item.name;
              const url = el.item.url;
              // Only add if not already collected
              if (!results.some(r => r.url === url)) {
                results.push({ url, name, ...kecamatanInfo });
              }
            }
          }
        }
      }
    } catch (e) {
      // JSON-LD parse error, skip
    }
  }
  
  return results;
}

// ── Step 2: Scrape detail page ──
function parseDetailPage(html) {
  // Extract geoCtx
  const gcMatch = html.match(/var geoCtx = ({.*?});/);
  if (!gcMatch) return null;
  
  try {
    const gc = JSON.parse(gcMatch[1]);
    // Extract title from h1
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    return { ...gc, title };
  } catch (e) {
    return null;
  }
}

// ── Main ──
async function main() {
  console.log('===== SPPG ACEH SCRAPER v2 =====');
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  // Step 0: Get kecamatan list
  console.log('📋 Extracting kecamatan slugs from map data...');
  const kecamatanList = extractKecamatanSlugs();
  
  // ── Phase 1: Scrape kecamatan listing pages ──
  console.log(`\n🔍 Phase 1: Scraping ${kecamatanList.length} kecamatan pages...`);
  
  const allSppg = [];
  let completed = 0;
  
  // Process in batches for concurrency
  for (let i = 0; i < kecamatanList.length; i += CONCURRENCY) {
    const batch = kecamatanList.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (kec) => {
      const url = `${BASE}/sppg/kecamatan/${kec.slug}`;
      const cacheKey = `kec_${kec.slug}`;
      try {
        const html = await fetchWithCache(url, cacheKey);
        const items = parseSppgFromListing(html, kec);
        return items;
      } catch (e) {
        console.error(`  ❌ ${kec.kecamatan}: ${e.message}`);
        return [];
      }
    }));
    
    for (const items of results) {
      allSppg.push(...items);
    }
    
    completed += batch.length;
    if (completed % 20 === 0 || completed === kecamatanList.length) {
      process.stdout.write(`\r  Progress: ${completed}/${kecamatanList.length} kecamatan, ${allSppg.length} SPPG found`);
    }
  }
  
  console.log(`\n\n📊 Total SPPG from kecamatan listings: ${allSppg.length}`);
  
  // Deduplicate by URL
  const unique = new Map();
  for (const s of allSppg) {
    if (!unique.has(s.url)) {
      unique.set(s.url, s);
    }
  }
  const sppgList = [...unique.values()];
  console.log(`📊 Unique SPPG (by URL): ${sppgList.length}`);
  
  // ── Phase 2: Scrape detail pages ──
  console.log(`\n🔍 Phase 2: Scraping ${sppgList.length} detail pages...`);
  
  let detailSuccess = 0;
  let detailFailed = 0;
  
  for (let i = 0; i < sppgList.length; i++) {
    const sppg = sppgList[i];
    const detailUrl = `${BASE}${sppg.url}`;
    const cacheKey = `detail_${sppg.url.replace(/\/sppg\/sppg-/g, '')}`;
    
    process.stdout.write(`\r  [${i+1}/${sppgList.length}] ${sppg.name.substring(0, 50)}...`);
    
    try {
      const html = await fetchWithCache(detailUrl, cacheKey);
      const detail = parseDetailPage(html);
      
      if (detail) {
        sppg.alamat = detail.alamat || '';
        sppg.kelurahan = detail.kelurahan || '';
        sppg.kecamatan_detail = detail.kecamatan || '';
        sppg.kabKota_detail = detail.kabKota || '';
        sppg.provinsi_detail = detail.provinsi || '';
        sppg.alamatLengkap = detail.alamatLengkap || '';
        sppg.title = detail.title || '';
        sppg.scrape_success = true;
        detailSuccess++;
      } else {
        sppg.scrape_success = false;
        detailFailed++;
      }
    } catch (e) {
      sppg.scrape_success = false;
      sppg.error = e.message;
      detailFailed++;
    }
    
    // Delay between requests
    if (i < sppgList.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  
  console.log(`\n\n✅ Detail pages: ${detailSuccess} success, ${detailFailed} failed`);
  
  // ── Phase 3: Output CSV ──
  console.log(`\n📄 Generating CSV...`);
  
  const headers = [
    'No', 'Nama SPPG', 'Provinsi', 'Kab/Kota', 'Kecamatan', 'Desa/Kelurahan', 
    'Alamat', 'Kab/Kota (detail)', 'Kecamatan (detail)', 'Alamat Lengkap',
    'Scrape Status'
  ];
  
  const rows = sppgList.map((s, i) => [
    i + 1,
    s.title || s.name,
    s.provinsi_detail || 'ACEH',
    s.kabKota_detail || s.kab_kota,
    s.kecamatan_detail || s.kecamatan,
    s.kelurahan || '',
    s.alamat || '',
    s.kabKota_detail || '',
    s.kecamatan_detail || '',
    s.alamatLengkap || '',
    s.scrape_success ? 'OK' : 'FAILED',
  ]);
  
  // Sort by kab/kota then name
  rows.sort((a, b) => {
    const kabCmp = (a[3] || '').localeCompare(b[3] || '');
    if (kabCmp !== 0) return kabCmp;
    return (a[1] || '').localeCompare(b[1] || '');
  });
  
  // Re-number after sorting
  rows.forEach((r, i) => r[0] = i + 1);
  
  let csv = '\uFEFF' + headers.join(',') + '\n';
  for (const r of rows) {
    const escaped = r.map(v => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`);
    csv += escaped.join(',') + '\n';
  }
  
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outPath = `/Users/leksa/Development/data-bgn/SPPG_Aceh_complete_${ts}.csv`;
  writeFileSync(outPath, csv, 'utf-8');
  
  // ── Summary ──
  console.log(`\n===== SELESAI =====`);
  console.log(`📄 Output: ${outPath}`);
  console.log(`📊 Total SPPG: ${rows.length}`);
  console.log(`✅ Detail scraped: ${detailSuccess}`);
  console.log(`❌ Detail failed: ${detailFailed}`);
  
  // Per-kab/kota breakdown
  const kabCounts = {};
  for (const r of rows) {
    const kab = r[3] || 'Unknown';
    kabCounts[kab] = (kabCounts[kab] || 0) + 1;
  }
  console.log(`\n📊 Per Kab/Kota:`);
  for (const [kab, count] of Object.entries(kabCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kab.padEnd(25)}: ${count}`);
  }
  console.log(`  ${'TOTAL'.padEnd(25)}: ${rows.length}`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
