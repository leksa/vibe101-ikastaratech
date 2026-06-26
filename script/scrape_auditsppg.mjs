import { readFileSync, writeFileSync } from 'fs';

// Read existing CSV
const csv = readFileSync('/Users/leksa/Development/data-bgn/SPPG_Aceh_clean.csv', 'utf-8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map(l => {
  // Simple CSV parse (no commas in fields assumed)
  const cols = l.split(',');
  return {
    no: cols[0],
    nama: cols[1],
    provinsi: cols[2],
    kab: cols[3],
    kec: cols[4],
    desa: cols[5],
    alamat: cols[6] || ''
  };
});

console.log(`Total SPPG dari CSV: ${rows.length}`);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUrl(row) {
  // SPPG Aceh Barat Daya Blangpidie Keude Paya
  // -> sppg-aceh-barat-daya-blangpidie-keude-paya
  const name = row.nama;
  // Remove "SPPG " prefix
  const withoutPrefix = name.replace(/^SPPG\s+/i, '');
  const slug = 'sppg-' + slugify(withoutPrefix);
  return `https://auditsppg.id/sppg/${slug}`;
}

async function scrapePage(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const match = html.match(/var geoCtx = ({.*?});/);
    if (!match) return null;
    const gc = JSON.parse(match[1]);
    // Extract title from h1
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    return { title, ...gc };
  } catch (e) {
    return null;
  }
}

// Results header
const outHeaders = ['No', 'Nama SPPG', 'Provinsi', 'Kab/Kota', 'Kecamatan', 'Desa/Kelurahan', 'Alamat'];
let outRows = [];

async function main() {
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const url = buildUrl(row);
    
    process.stdout.write(`[${i+1}/${rows.length}] ${row.nama}... `);
    
    const data = await scrapePage(url);
    
    if (data) {
      const prov = data.provinsi || row.provinsi;
      const kab = (data.kabKota || row.kab).replace(/^KAB\.\s*/i, '').replace(/^KOTA\s+/i, '');
      const kec = data.kecamatan || row.kec;
      const desa = data.kelurahan || row.desa;
      const alamat = data.alamat || row.alamat;
      const nama = data.title || row.nama;
      
      outRows.push([i+1, nama, prov, kab, kec, desa, alamat]);
      success++;
      console.log('✅');
    } else {
      // Fallback to CSV data
      outRows.push([i+1, row.nama, row.provinsi, row.kab, row.kec, row.desa, row.alamat]);
      failed++;
      console.log('❌ (fallback to CSV)');
    }
    
    // Delay 500ms between requests
    if (i < rows.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Build CSV
  let outCsv = outHeaders.join(',') + '\n';
  for (const r of outRows) {
    const escaped = r.map(v => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`);
    outCsv += escaped.join(',') + '\n';
  }
  
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outPath = `/Users/leksa/Development/data-bgn/SPPG_Aceh_auditsppg_${ts}.csv`;
  writeFileSync(outPath, '\uFEFF' + outCsv, 'utf-8');
  
  console.log(`\n===== SELESAI =====`);
  console.log(`✅ Sukses: ${success}`);
  console.log(`❌ Gagal: ${failed} (fallback ke data CSV)`);
  console.log(`📄 Output: ${outPath}`);
}

main().catch(console.error);
