#!/usr/bin/env python3
import csv
import sys
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

import requests

SEMESTER = "20252"
OUTPUT_FILE = "dapodik_pd_kecamatan.csv"
BASE_URL = "https://dapo.kemendikdasmen.go.id/rekap/dataPD"
MAX_WORKERS = 3
MAX_RETRIES = 10
BASE_DELAY = 2.0

JENJANG = [
    "tk_pd", "tk_pd_laki", "tk_pd_perempuan",
    "kb_pd", "kb_pd_laki", "kb_pd_perempuan",
    "tpa_pd", "tpa_pd_laki", "tpa_pd_perempuan",
    "sps_pd", "sps_pd_laki", "sps_pd_perempuan",
    "pkbm_pd", "pkbm_pd_laki", "pkbm_pd_perempuan",
    "skb_pd", "skb_pd_laki", "skb_pd_perempuan",
    "sma_pd", "sma_pd_laki", "sma_pd_perempuan",
    "smk_pd", "smk_pd_laki", "smk_pd_perempuan",
    "slb_pd", "slb_pd_laki", "slb_pd_perempuan",
    "sd_pd", "sd_pd_laki", "sd_pd_perempuan",
    "smp_pd", "smp_pd_laki", "smp_pd_perempuan",
]

FIELDNAMES = [
    "provinsi", "kabkota", "nama", "kode_wilayah",
    "total_pd", "total_pd_laki", "total_pd_perempuan",
] + JENJANG


def make_session():
    s = requests.Session()
    s.headers.update({
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://dapo.kemendikdasmen.go.id/pd",
    })
    s.get("https://dapo.kemendikdasmen.go.id/pd", timeout=30)
    return s


def fetch_level(session, level, kode_wilayah, label=""):
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(delay + random.uniform(0, 1))
            resp = session.get(BASE_URL, params={
                "id_level_wilayah": level,
                "kode_wilayah": kode_wilayah,
                "semester_id": SEMESTER,
            }, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 503:
                delay *= 2
            else:
                return []
        except Exception as e:
            delay *= 2
    return []


def row_from_kec(kab, d):
    r = {
        "provinsi": kab["provinsi"],
        "kabkota": kab["nama"],
        "kode_wilayah": d["kode_wilayah"],
        "nama": d["nama"],
        "total_pd": d.get("total_pd", 0),
        "total_pd_laki": d.get("total_pd_laki", 0),
        "total_pd_perempuan": d.get("total_pd_perempuan", 0),
    }
    for key in JENJANG:
        r[key] = d.get(key, 0)
    return r


def main():
    start = time.time()
    print("=== Scrape DAPODIK PD ===", file=sys.stderr)
    session = make_session()

    # Write header
    with open(OUTPUT_FILE, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()

    provs_raw = fetch_level(session, 0, "000000", "provinces")
    provinces = [{"kode_wilayah": p["kode_wilayah"], "nama": p["nama"]} for p in provs_raw]
    print(f"Provinces: {len(provinces)}", file=sys.stderr)

    all_kabkota = []
    for p in provinces:
        data = fetch_level(session, 1, p["kode_wilayah"], p["nama"])
        for d in data:
            all_kabkota.append({
                "provinsi": p["nama"],
                "kode_wilayah": d["kode_wilayah"],
                "nama": d["nama"],
            })
        print(f"  {p['nama']}: {len(data)} kabkota", file=sys.stderr)
    print(f"Total kabkota: {len(all_kabkota)}", file=sys.stderr)
    sys.stderr.flush()

    total_kab = len(all_kabkota)
    done = 0
    buf = []

    def fetch_one(kab):
        data = fetch_level(session, 2, kab["kode_wilayah"],
                           f"{kab['provinsi']} - {kab['nama']}")
        return [row_from_kec(kab, d) for d in data]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        fut_map = {ex.submit(fetch_one, kab): kab for kab in all_kabkota}
        for fut in as_completed(fut_map):
            kab = fut_map[fut]
            done += 1
            try:
                rows = fut.result()
                buf.extend(rows)
            except Exception:
                pass

            # Flush every 10 kabkota
            if len(buf) >= 500 or done == total_kab:
                with open(OUTPUT_FILE, "a", newline="") as f:
                    w = csv.DictWriter(f, fieldnames=FIELDNAMES)
                    w.writerows(buf)
                buf = []

            if done % 20 == 0 or done == total_kab:
                lines = sum(1 for _ in open(OUTPUT_FILE)) - 1
                print(f"  {done}/{total_kab} kabkota ({lines} kecamatan)", file=sys.stderr)
                sys.stderr.flush()

    elapsed = time.time() - start
    lines = sum(1 for _ in open(OUTPUT_FILE)) - 1
    print(f"\nDone: {lines} kecamatan in {elapsed:.0f}s", file=sys.stderr)
    print(f"Output: {OUTPUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
