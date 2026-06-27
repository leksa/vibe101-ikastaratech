-- ============================================================
-- Prevalensi stunting per provinsi (SSGI/SKI 2024)
-- Sumber: docs/reference/Peta-Prevalensi-Stunting-Per-Provinsi.csv
-- Kategori WHO: <20 Rendah, 20-29 Sedang, 30-39 Tinggi, >=40 Sangat Tinggi
-- provinsi di-UPPERCASE agar match ref_provinsi / kolom provinsi lain.
-- ============================================================

CREATE TABLE IF NOT EXISTS stunting_provinsi (
    provinsi   TEXT PRIMARY KEY,
    prevalensi NUMERIC(4,1) NOT NULL,
    kategori   TEXT NOT NULL,
    tahun      INTEGER NOT NULL
);

INSERT INTO stunting_provinsi (provinsi, prevalensi, kategori, tahun) VALUES
  ('ACEH', 28.6, 'Sedang', 2024),
  ('BALI', 8.7, 'Rendah', 2024),
  ('BANTEN', 21.1, 'Sedang', 2024),
  ('BENGKULU', 18.8, 'Rendah', 2024),
  ('DAERAH ISTIMEWA YOGYAKARTA', 17.4, 'Rendah', 2024),
  ('DKI JAKARTA', 17.3, 'Rendah', 2024),
  ('GORONTALO', 23.8, 'Sedang', 2024),
  ('JAMBI', 17.1, 'Rendah', 2024),
  ('JAWA BARAT', 15.9, 'Rendah', 2024),
  ('JAWA TENGAH', 17.1, 'Rendah', 2024),
  ('JAWA TIMUR', 14.7, 'Rendah', 2024),
  ('KALIMANTAN BARAT', 26.8, 'Sedang', 2024),
  ('KALIMANTAN SELATAN', 22.9, 'Sedang', 2024),
  ('KALIMANTAN TENGAH', 22.1, 'Sedang', 2024),
  ('KALIMANTAN TIMUR', 22.2, 'Sedang', 2024),
  ('KALIMANTAN UTARA', 17.6, 'Rendah', 2024),
  ('KEPULAUAN BANGKA BELITUNG', 20.1, 'Sedang', 2024),
  ('KEPULAUAN RIAU', 15, 'Rendah', 2024),
  ('LAMPUNG', 15.9, 'Rendah', 2024),
  ('MALUKU', 28.4, 'Sedang', 2024),
  ('MALUKU UTARA', 23.2, 'Sedang', 2024),
  ('NUSA TENGGARA BARAT', 29.8, 'Sedang', 2024),
  ('NUSA TENGGARA TIMUR', 37, 'Tinggi', 2024),
  ('PAPUA', 24.7, 'Sedang', 2024),
  ('PAPUA BARAT', 24.6, 'Sedang', 2024),
  ('PAPUA BARAT DAYA', 30.5, 'Tinggi', 2024),
  ('PAPUA PEGUNUNGAN', 40, 'Sangat Tinggi', 2024),
  ('PAPUA SELATAN', 25.8, 'Sedang', 2024),
  ('PAPUA TENGAH', 32.5, 'Tinggi', 2024),
  ('RIAU', 20.1, 'Sedang', 2024),
  ('SULAWESI BARAT', 35.4, 'Tinggi', 2024),
  ('SULAWESI SELATAN', 23.3, 'Sedang', 2024),
  ('SULAWESI TENGAH', 26.1, 'Sedang', 2024),
  ('SULAWESI TENGGARA', 26.1, 'Sedang', 2024),
  ('SULAWESI UTARA', 20.8, 'Sedang', 2024),
  ('SUMATERA BARAT', 24.9, 'Sedang', 2024),
  ('SUMATERA SELATAN', 15.9, 'Rendah', 2024),
  ('SUMATERA UTARA', 22, 'Sedang', 2024)
ON CONFLICT (provinsi) DO UPDATE
  SET prevalensi = EXCLUDED.prevalensi,
      kategori   = EXCLUDED.kategori,
      tahun      = EXCLUDED.tahun;
