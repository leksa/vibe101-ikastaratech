#!/usr/bin/env python3
import csv
import sys
import os
import re

def load_wilayah(path):
    prov_map = {}
    kabkota_map = {}
    kec_by_kab = {}
    desa_by_kec = {}

    kabkota_to_prov = {}
    kec_to_kab = {}

    with open(path, 'r', encoding='utf-8') as f:
        for row in csv.reader(f):
            if not row or len(row) < 2:
                continue
            kode = row[0].strip()
            nama = row[1].strip().upper()
            parts = kode.split('.')
            level = len(parts)

            if level == 1:
                prov_map[nama] = kode
            elif level == 2:
                kabkota_map[nama] = kode
                kabkota_to_prov[kode] = parts[0]
            elif level == 3:
                kec_to_kab[kode] = '.'.join(parts[:2])
                kec_by_kab.setdefault('.'.join(parts[:2]), {})[nama] = kode
            elif level == 4:
                parent_kec = '.'.join(parts[:3])
                desa_by_kec.setdefault(parent_kec, {})[nama] = kode

    return prov_map, kabkota_map, kec_by_kab, desa_by_kec


KNOWN_PROVINCES = [
    'ACEH', 'BALI', 'BANTEN', 'BENGKULU', 'DAERAH ISTIMEWA YOGYAKARTA',
    'DKI JAKARTA', 'GORONTALO', 'JAMBI', 'JAWA BARAT', 'JAWA TENGAH',
    'JAWA TIMUR', 'KALIMANTAN BARAT', 'KALIMANTAN SELATAN', 'KALIMANTAN TENGAH',
    'KALIMANTAN TIMUR', 'KALIMANTAN UTARA', 'KEPULAUAN BANGKA BELITUNG',
    'KEPULAUAN RIAU', 'LAMPUNG', 'MALUKU', 'MALUKU UTARA',
    'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR',
    'PAPUA', 'PAPUA BARAT', 'PAPUA BARAT DAYA', 'PAPUA PEGUNUNGAN',
    'PAPUA SELATAN', 'PAPUA TENGAH',
    'RIAU', 'SULAWESI BARAT', 'SULAWESI SELATAN', 'SULAWESI TENGAH',
    'SULAWESI TENGGARA', 'SULAWESI UTARA', 'SUMATERA BARAT', 'SUMATERA SELATAN',
    'SUMATERA UTARA'
]


def normalize(name):
    return re.sub(r'\s+', ' ', name.upper().strip())


def collapse_space(s):
    return re.sub(r'\s+', '', s)


def clean_kabkota_name(name):
    """Clean kabupaten/kota name: strip province suffixes, normalize known variations."""
    for prov in KNOWN_PROVINCES:
        if name.endswith(' ' + prov):
            name = name[:-(len(prov) + 1)]
            break
    if 'KEPULAUAN SERIBU' in name:
        name = name.replace('KEPULAUAN SERIBU', 'KEP. SERIBU')
    if 'ADMINISTRASI' in name:
        name = name.replace('ADMINISTRASI', 'ADM.')
    # "ADM " (no dot) -> "ADM. " e.g. "KAB. ADM KEP. SERIBU"
    name = re.sub(r'\bADM\b(?!\.)', 'ADM.', name)
    return name


def fuzzy_match(name, candidates):
    best, best_score = None, 0
    clean = collapse_space(name)
    for c in candidates:
        c_clean = collapse_space(c)
        if c == name or c_clean == clean:
            return c
        if clean in c_clean or c_clean in clean:
            score = len(c)
            if score > best_score:
                best, best_score = c, score
    return best


def find_kode(prov_name, kabkota_name, kec_name, desa_name,
              prov_map, kabkota_map, kec_by_kab, desa_by_kec):
    prov_name = normalize(prov_name)
    kabkota_name = normalize(kabkota_name)
    kec_name = normalize(kec_name)
    desa_name = normalize(desa_name)

    prov_clean = collapse_space(prov_name)
    prov_kode = ''
    for k, v in prov_map.items():
        if prov_name in k or k in prov_name or prov_clean == collapse_space(k):
            prov_kode = v
            break
    if not prov_kode:
        return ''

    kabkota_name = clean_kabkota_name(kabkota_name)
    kabkota_norm = fuzzy_match(kabkota_name, kabkota_map.keys())
    if not kabkota_norm:
        return prov_kode
    kabkota_kode = kabkota_map[kabkota_norm]

    kec_candidates = kec_by_kab.get(kabkota_kode, {})
    if not kec_candidates:
        return kabkota_kode

    kec_norm = fuzzy_match(kec_name, kec_candidates.keys())
    if not kec_norm:
        return kabkota_kode
    kec_kode = kec_candidates[kec_norm]

    desa_candidates = desa_by_kec.get(kec_kode, {})
    if not desa_candidates:
        return kec_kode

    desa_norm = fuzzy_match(desa_name, desa_candidates.keys())
    return desa_candidates.get(desa_norm, kec_kode) if desa_norm else kec_kode


def process(input_path, output_path, wilayah_path):
    print(f"Load wilayah: {wilayah_path}")
    prov_map, kabkota_map, kec_by_kab, desa_by_kec = load_wilayah(wilayah_path)
    kab_total = sum(len(v) for v in kec_by_kab.values())
    desa_total = sum(len(v) for v in desa_by_kec.values())
    print(f"  {len(prov_map)} prov, {len(kabkota_map)} kabkota, "
          f"{kab_total} kec, {desa_total} desa")

    rows = []
    with open(input_path, 'r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            rows.append(row)
    print(f"  {len(rows)} SPPG entries")

    matched, partial, unmatched = 0, 0, 0
    output_rows = []

    for row in rows:
        kode = find_kode(
            row.get('Provinsi', ''),
            row.get('Kota/Kabupaten', ''),
            row.get('Kecamatan', ''),
            row.get('Desa/Kelurahan', ''),
            prov_map, kabkota_map, kec_by_kab, desa_by_kec
        )
        if not kode:
            unmatched += 1
        elif len(kode.split('.')) >= 4:
            matched += 1
        else:
            partial += 1

        output_rows.append({
            'provinsi': row.get('Provinsi', ''),
            'kabkota': row.get('Kota/Kabupaten', ''),
            'kecamatan': row.get('Kecamatan', ''),
            'desa': row.get('Desa/Kelurahan', ''),
            'kode_wilayah': kode,
            'nama_sppg': row.get('Nama SPPG', ''),
            'alamat': row.get('Alamat', ''),
        })

    print(f"  Full: {matched}  Partial: {partial}  Unmatched: {unmatched}")
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=['provinsi', 'kabkota', 'kecamatan', 'desa',
                                          'kode_wilayah', 'nama_sppg', 'alamat'])
        w.writeheader()
        w.writerows(output_rows)
    print(f"Output: {output_path}")


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    wilayah_path = os.path.join(script_dir, 'wilayah_base.csv')
    if len(sys.argv) < 2:
        print("Usage: python map_wilayah.py <input_csv> [output_csv]")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) >= 3 else \
        os.path.splitext(input_path)[0] + '_mapped.csv'
    process(input_path, output_path, wilayah_path)
