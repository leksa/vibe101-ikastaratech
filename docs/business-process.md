# Business Process — Coverage SPPG vs Penerima

## Konteks

Program **Makan Bergizi Gratis (MBG)** dilayani oleh dapur **SPPG** (Satuan Pelayanan
Pemenuhan Gizi). Pertanyaan kebijakan: **apakah jumlah SPPG di tiap kecamatan cukup
untuk melayani populasi penerima (peserta didik PAUD + SD)?**

## Sumber data

| Sumber | Isi | Granularitas |
|--------|-----|--------------|
| auditsppg / SPPG Indonesia | lokasi & nama dapur SPPG | per dapur (titik) |
| DAPODIK | jumlah peserta didik per jenjang | per kecamatan |
| BPS / Kemendagri | kode & koordinat wilayah | per kecamatan |

Penghubung antar-sumber: **kode kecamatan**. SPPG pakai kode BPS, DAPODIK pakai kode
wilayah DAPODIK → dijembatani tabel `kecamatan_mapping`.

## Definisi & rumus

- **Penerima sasaran** per kecamatan = `sd_pd + tk_pd + kb_pd + tpa_pd + sps_pd`
  (PAUD + SD; jenjang SMP/SMA/SMK/SLB tidak dihitung sebagai sasaran MBG di model ini).
- **Kapasitas** = `jumlah_sppg × 2000` porsi/hari (asumsi 1 SPPG = 2000 porsi/hari).
- **Coverage %** = `kapasitas / penerima × 100`.
- **Tier**: `< 70%` merah (kurang), `70–90%` kuning (cukup), `≥ 90%` hijau (memadai).

> Asumsi 2000 porsi/SPPG adalah parameter kebijakan, bukan fakta lapangan; semua angka
> coverage sensitif terhadap nilai ini. Diubah di `backend/lib/coverage.js`.

## Output

Dashboard menyajikan: ringkasan nasional, distribusi per provinsi, peta sebaran SPPG,
tabel peserta didik, dan analisis coverage berwarna per kecamatan/kabkota/provinsi.

## Isu data yang diketahui (TODO perbaikan akar)

1. **Provinsi kotor**: ~26 baris SPPG punya fragmen alamat di kolom `provinsi`
   (mis. "GANG KELAPA GADING", "NO. 595"). Saat ini disaring di lapis query
   (`ref_provinsi` + `v_sppg`). Akar masalah: parser scrape salah memetakan kolom alamat
   → perlu diperbaiki di `script/scrape_*`/`clean_and_remap.py`.
2. **Kecamatan tanpa koordinat**: sebagian `kecamatan_coords` kosong → marker peta hilang.
3. **Mapping BPS↔DAPODIK** tidak 100%; kecamatan tak ter-match tidak punya angka penerima
   (tier = tanpa data).
