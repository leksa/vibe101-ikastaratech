#!/usr/bin/env python3
import requests
import csv
import re
import time
import sys
import os
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://auditsppg.id"
MAX_WORKERS = 30
REQUEST_DELAY = 0.05

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
})

def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=60)
            resp.encoding = 'utf-8'
            return resp.text
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2)
    return ''

def get_provinces():
    html = fetch(f"{BASE_URL}/sppg")
    soup = BeautifulSoup(html, 'html.parser')
    seen = set()
    provinces = []
    for a in soup.select('a[href*="/sppg/provinsi/"]'):
        slug = a['href'].split('/')[-1]
        name = a.get_text(strip=True).upper()
        if slug and name and slug not in seen:
            seen.add(slug)
            provinces.append((slug, name))
    return provinces

def get_kelurahan_links(prov_slug):
    html = fetch(f"{BASE_URL}/sppg/provinsi/{prov_slug}")
    soup = BeautifulSoup(html, 'html.parser')
    return [a['href'] for a in soup.select('a[href*="/sppg/kelurahan/"]')]

def parse_kota_kab(path):
    if '-kab-' in path:
        return 'KAB. ' + path.split('-kab-')[1].replace('-', ' ').upper()
    if '-kota-' in path:
        return 'KOTA ' + path.split('-kota-')[1].replace('-', ' ').upper()
    return ''

def parse_alamat_provinsi(alamat):
    if not alamat:
        return ''
    m = re.search(r'(?:Provinsi|Prov\.)\s*([^,]+?)$', alamat, re.IGNORECASE)
    if m:
        return m.group(1).strip().upper()
    parts = [p.strip() for p in alamat.split(',')]
    return parts[-1].upper() if len(parts) >= 2 else ''

def scrape_kelurahan_page(path, prov_name):
    url = BASE_URL + path
    html = fetch(url)
    soup = BeautifulSoup(html, 'html.parser')
    path_parts = [p for p in path.rstrip('/').split('/') if p]
    kel_slug = path_parts[-1] if path_parts else ''

    parts = kel_slug.split('-kab-') if '-kab-' in kel_slug else kel_slug.split('-kota-')
    desa_kec = parts[0] if parts else ''
    desa_parts = desa_kec.rsplit('-', 1)
    desa = (desa_parts[0] if len(desa_parts) >= 2 else desa_kec).replace('-', ' ').upper()
    kecamatan = (desa_parts[1] if len(desa_parts) >= 2 else '').replace('-', ' ').upper()
    kota = parse_kota_kab(path)

    results = []
    for card in soup.select('a.spc'):
        nama_el = card.select_one('.cn')
        alamat_el = card.select_one('.ca-t')
        href = card.get('href', '')
        nama = nama_el.get_text(strip=True) if nama_el else ''
        alamat = alamat_el.get_text(strip=True) if alamat_el else ''
        if not nama:
            continue
        slug_unit = href.split('/')[-1] if href else ''
        prov_alt = parse_alamat_provinsi(alamat)
        results.append({
            'slug': slug_unit,
            'nama': nama,
            'desa': desa,
            'kecamatan': kecamatan,
            'kota': kota,
            'provinsi': prov_alt or prov_name,
            'alamat': alamat,
            'detail_url': f"{BASE_URL}{href}",
        })
    return results

def main():
    print("=" * 60)
    print("SCRAPER DATA SPPG - auditsppg.id")
    print("Mode: Kelurahan/Desa pages")
    print(f"Concurrent workers: {MAX_WORKERS}")
    print("=" * 60)

    print("\n[1] Getting provinces...")
    provinces = get_provinces()
    print(f"    {len(provinces)} provinces found")

    print("\n[2] Collecting kelurahan links from province pages...")
    province_data = []
    for slug, name in sorted(provinces):
        try:
            links = get_kelurahan_links(slug)
            province_data.append((slug, name, links))
            print(f"    {name:30s} -> {len(links):5d} kelurahan")
        except Exception as e:
            print(f"    {name:30s} -> ERROR: {e}")
            province_data.append((slug, name, []))
    total_kel = sum(len(links) for _, _, links in province_data)
    print(f"\n    Total: {total_kel} kelurahan pages")

    all_jobs = [(path, name) for _, name, links in province_data for path in links]
    sppg_map = {}
    completed = 0
    errors = 0
    start = time.time()

    print("\n[3] Scraping kelurahan pages...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        fut_map = {ex.submit(scrape_kelurahan_page, path, pn): (path, pn) for path, pn in all_jobs}
        for f in as_completed(fut_map):
            completed += 1
            pct = completed * 100 / len(all_jobs)
            elapsed = time.time() - start
            rate = completed / elapsed if elapsed > 0 else 0
            eta = (len(all_jobs) - completed) / rate if rate > 0 else 0
            sys.stdout.write(f"\r    [{completed}/{len(all_jobs)}] {pct:.0f}% | {rate:.1f}/s | ETA: {eta:.0f}s   ")
            sys.stdout.flush()
            try:
                for r in f.result():
                    if r['slug'] not in sppg_map:
                        sppg_map[r['slug']] = r
            except Exception:
                errors += 1

    elapsed = time.time() - start
    print(f"\n    Done! {len(sppg_map)} unique SPPG, {errors} errors, {elapsed:.0f}s")

    print("\n[4] Generating CSV...")
    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"sppg_data_{timestamp}.csv"
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['No', 'Nama SPPG', 'Provinsi', 'Kota/Kabupaten', 'Kecamatan', 'Desa/Kelurahan', 'Alamat', 'Link Detail', 'Kode Wilayah', 'Koordinat'])
        for idx, slug in enumerate(sorted(sppg_map.keys()), 1):
            s = sppg_map[slug]
            writer.writerow([idx, s['nama'], s['provinsi'], s['kota'], s['kecamatan'], s['desa'], s['alamat'], s['detail_url'], '', ''])

    print(f"\n{'=' * 60}")
    print(f"SELESAI! {len(sppg_map)} SPPG")
    print(f"File: {filename}")
    print(f"Waktu: {elapsed:.0f}s")
    print(f"{'=' * 60}")

if __name__ == '__main__':
    main()
