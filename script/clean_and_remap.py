#!/usr/bin/env python3
"""
Clean scraper data (fix garbled provinsi field) and remap kode_wilayah.
Handles: HTML entities, alamat/kecamatan in provinsi field, numeric provinsi, etc.
"""
import csv
import re
import os
import sys

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
    'SUMATERA UTARA',
    # Common variants
    'YOGYAKARTA', 'BANGKA BELITUNG', 'KEP. BANGKA BELITUNG',
    'KEP. RIAU', 'NTT', 'NTB',
]

# Province name normalization mapping
PROVINCE_ALIASES = {
    'YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
    'DI YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
    'D.I. YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
    'DIY': 'DAERAH ISTIMEWA YOGYAKARTA',
    'D.K.I. JAKARTA': 'DKI JAKARTA',
    'DKI': 'DKI JAKARTA',
    'JAKARTA': 'DKI JAKARTA',
    'DAERAH KHUSUS IBUKOTA JAKARTA': 'DKI JAKARTA',
    'BANGKA BELITUNG': 'KEPULAUAN BANGKA BELITUNG',
    'KEP. BANGKA BELITUNG': 'KEPULAUAN BANGKA BELITUNG',
    'KEP. BABEL': 'KEPULAUAN BANGKA BELITUNG',
    'NTB': 'NUSA TENGGARA BARAT',
    'NTT': 'NUSA TENGGARA TIMUR',
}

PROVINCE_ORDER = sorted(KNOWN_PROVINCES, key=len, reverse=True)


def normalize(s):
    return re.sub(r'\s+', ' ', s.upper().strip())


def collapse_space(s):
    return re.sub(r'\s+', '', s)


def clean_html_entities(s):
    """Decode HTML entities in province name."""
    s = s.upper()
    # Handle multi-level &AMP; encoding
    while '&AMP;' in s or '&NBSP;' in s or '&NBSP' in s:
        s = s.replace('&AMP;', '&')
        s = s.replace('&NBSP;', ' ')
        s = s.replace('&NBSP', ' ')
    return s


def extract_province_from_text(text):
    """Try to find a known province name anywhere in text."""
    text = normalize(text)
    for prov in PROVINCE_ORDER:
        if prov in text:
            return PROVINCE_ALIASES.get(prov, prov)
    return ''


def extract_trailing_province(text):
    """Extract province name from the end of text after delimiter."""
    # Try splitting by common delimiters
    for delim in ['. ', '.', ',', '--', ' - ']:
        parts = text.split(delim)
        if len(parts) >= 2:
            candidate = normalize(parts[-1])
            prov = extract_province_from_text(candidate)
            if prov:
                return prov
    return ''


def clean_provinsi(raw_prov, kabkota, prov_map, kabkota_to_prov):
    """
    Clean and derive province name from raw provinsi field.
    Falls back to deriving from kabkota if provinsi is unreliable.
    """
    raw = raw_prov.strip()
    if not raw:
        return _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map)

    # Step 1: Clean HTML entities
    cleaned = clean_html_entities(raw)
    cleaned = normalize(cleaned)
    # Remove trailing dots and whitespace
    cleaned = cleaned.rstrip('.')
    cleaned = normalize(cleaned)

    # Step 2: Direct match against known provinces
    prov = extract_province_from_text(cleaned)
    if prov:
        return prov

    # Step 3: Try trailing province extraction
    prov = extract_trailing_province(cleaned)
    if prov:
        return prov

    # Step 4: If numeric or address-like, derive from kabkota
    if cleaned.isdigit() or any(kw in cleaned for kw in
       ['DUSUN', 'RT.', 'RW.', 'JL.', 'DESA', 'KP.', 'KECAMATAN', 'KEC.',
        'KELURAHAN', 'GG.', 'GANG', 'ALAMAT', 'NO.', 'SPPG']):
        return _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map)

    # Step 5: If starts with KAB./KOTA/KABUPATEN, try to extract province from end
    if cleaned.startswith('KAB.') or cleaned.startswith('KOTA') or cleaned.startswith('KABUPATEN'):
        # Try to find province name anywhere in the string
        prov = extract_province_from_text(cleaned)
        if prov:
            return prov
        # Try removing the kabkota prefix and checking the remainder
        for prefix in ['KABUPATEN', 'KAB.', 'KOTA']:
            if cleaned.startswith(prefix):
                remainder = cleaned[len(prefix):].strip()
                # Remove 'ADALAH' and numbers
                remainder = re.sub(r'\bADALAH\b.*', '', remainder).strip()
                prov = extract_province_from_text(remainder)
                if prov:
                    return prov
        return _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map)

    # Step 6: If starts with KECAMATAN/KEC, contain address context, derive from kabkota
    if cleaned.startswith('KECAMATAN') or cleaned.startswith('KEC.') or cleaned.startswith('KEC'):
        return _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map)

    # Step 7: Unknown - try matching collapse_space against all provinces
    clean_collapsed = collapse_space(cleaned)
    for prov in KNOWN_PROVINCES:
        if collapse_space(prov) == clean_collapsed:
            return PROVINCE_ALIASES.get(prov, prov)

    # Step 8: Last resort - derive from kabkota
    return _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map)


def _derive_prov_from_kabkota(kabkota, kabkota_to_prov, prov_map):
    kabkota_clean = normalize(kabkota)
    if not kabkota_clean:
        return ''
    kabkota_clean = clean_kabkota_name(kabkota_clean)

    # Look up in reverse mapping
    for kab_name, kab_kode in kabkota_to_prov.items():
        if collapse_space(kab_name) == collapse_space(kabkota_clean) or \
           kab_name == kabkota_clean or \
           kabkota_clean in kab_name or kab_name in kabkota_clean:
            prov_kode = '.'.join(kab_kode.split('.')[:1])
            # Find province name from kode
            for pname, pkode in prov_map.items():
                if pkode == prov_kode:
                    return pname

    # Fuzzy: try partial match
    for kab_name, kab_kode in kabkota_to_prov.items():
        if collapse_space(kabkota_clean) in collapse_space(kab_name) or \
           collapse_space(kab_name) in collapse_space(kabkota_clean):
            prov_kode = '.'.join(kab_kode.split('.')[:1])
            for pname, pkode in prov_map.items():
                if pkode == prov_kode:
                    return pname
    return ''


def load_wilayah(path):
    prov_map = {}
    kabkota_map = {}
    kec_by_kab = {}
    desa_by_kec = {}

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
            elif level == 3:
                kec_by_kab.setdefault('.'.join(parts[:2]), {})[nama] = kode
            elif level == 4:
                parent_kec = '.'.join(parts[:3])
                desa_by_kec.setdefault(parent_kec, {})[nama] = kode

    return prov_map, kabkota_map, kec_by_kab, desa_by_kec


def clean_kabkota_name(name):
    for prov in KNOWN_PROVINCES:
        if name.endswith(' ' + prov):
            name = name[:-(len(prov) + 1)]
            break
    if 'KEPULAUAN SERIBU' in name:
        name = name.replace('KEPULAUAN SERIBU', 'KEP. SERIBU')
    if 'ADMINISTRASI' in name:
        name = name.replace('ADMINISTRASI', 'ADM.')
    name = re.sub(r'\bADM\b(?!\.)', 'ADM.', name)
    name = re.sub(r'\bKEP SERIBU\b(?!\.)', 'KEP. SERIBU', name)
    name = re.sub(r'\bKEP SERIBU\.\b', 'KEP. SERIBU', name)
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


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    wilayah_path = os.path.join(script_dir, 'wilayah_base.csv')
    input_path = os.path.join(script_dir, 'sppg_data_2026-06-26_10-58-35.csv')
    output_path = os.path.join(script_dir, 'sppg_data_2026-06-26_10-58-35_cleaned_mapped.csv')

    if len(sys.argv) >= 2:
        input_path = sys.argv[1]
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]

    print(f"Load wilayah: {wilayah_path}")
    prov_map, kabkota_map, kec_by_kab, desa_by_kec = load_wilayah(wilayah_path)
    print(f"  {len(prov_map)} prov, {len(kabkota_map)} kabkota, "
          f"{sum(len(v) for v in kec_by_kab.values())} kec, "
          f"{sum(len(v) for v in desa_by_kec.values())} desa")

    # Build kabkota → provinsi reverse mapping
    kabkota_to_prov = {}
    for nama, kode in kabkota_map.items():
        kabkota_to_prov[nama] = kode

    # Load scraper data
    rows = []
    with open(input_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  {len(rows)} SPPG entries")

    matched, partial, unmatched, fixed_prov = 0, 0, 0, 0
    output_rows = []

    for row in rows:
        raw_prov = row.get('Provinsi', '')
        kabkota_raw = row.get('Kota/Kabupaten', '')

        # Clean the provinsi field
        cleaned_prov = clean_provinsi(raw_prov, kabkota_raw,
                                       prov_map, kabkota_to_prov)
        if cleaned_prov and normalize(cleaned_prov) != normalize(raw_prov):
            fixed_prov += 1

        prov_name = cleaned_prov if cleaned_prov else raw_prov

        kode = find_kode(
            prov_name,
            kabkota_raw,
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
            'provinsi': prov_name,
            'kabkota': row.get('Kota/Kabupaten', ''),
            'kecamatan': row.get('Kecamatan', ''),
            'desa': row.get('Desa/Kelurahan', ''),
            'kode_wilayah': kode,
            'nama_sppg': row.get('Nama SPPG', ''),
            'alamat': row.get('Alamat', ''),
        })

    print(f"\nProvinsi cleaned/fixed: {fixed_prov}")
    print(f"Full: {matched}  Partial: {partial}  Unmatched: {unmatched}")
    print(f"Total matched (full+partial): {matched + partial} "
          f"({(matched+partial)*100//len(rows)}%)")

    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=['provinsi', 'kabkota', 'kecamatan',
                                          'desa', 'kode_wilayah', 'nama_sppg', 'alamat'])
        w.writeheader()
        w.writerows(output_rows)
    print(f"\nOutput: {output_path}")

    # Also check what's still unmatched
    unmatched_rows = [r for r in output_rows if not r['kode_wilayah']]
    if unmatched_rows:
        print(f"\nSample masih unmatched ({len(unmatched_rows)} total):")
        for r in unmatched_rows[:10]:
            print(f"  prov=[{r['provinsi']:30s}] kab=[{r['kabkota']:30s}] "
                  f"kec=[{r['kecamatan']:25s}] desa=[{r['desa']:30s}]")

    # Still unmatched analysis
    if unmatched_rows:
        print(f"\n=== Analisis masih unmatched ===")
        reasons = {}
        for r in unmatched_rows:
            p = r['provinsi'].strip()
            k = r['kabkota'].strip()
            if not p:
                key = 'provinsi_kosong'
            elif not k:
                key = 'kabkota_kosong'
            elif p and k:
                key = 'prov_kab_tapi_gagal'
            else:
                key = 'lainnya'
            reasons[key] = reasons.get(key, 0) + 1
        for k, v in sorted(reasons.items(), key=lambda x: -x[1]):
            print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
