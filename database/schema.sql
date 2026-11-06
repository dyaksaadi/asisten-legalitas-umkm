-- Schema Database Asisten Legalitas UMKM
-- Digunakan untuk menyimpan aturan perizinan & data referensi
-- PERHATIAN: Tidak menyimpan data pribadi atau identitas pengguna (Privacy by Design - UU PDP No. 27/2022)

CREATE TABLE IF NOT EXISTS perizinan_rules (
    id TEXT PRIMARY KEY,
    kategori TEXT NOT NULL,
    nama_izin TEXT NOT NULL,
    penerbit TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    kriteria_json TEXT NOT NULL,
    syarat_dokumen_json TEXT NOT NULL,
    terakhir_diperbarui DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS panduan_oss (
    id TEXT PRIMARY KEY,
    tahap_ke INTEGER NOT NULL,
    judul TEXT NOT NULL,
    langkah_json TEXT NOT NULL,
    link_referensi TEXT
);

CREATE TABLE IF NOT EXISTS feedback_anonim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skor_kemudahan INTEGER NOT NULL,
    pesan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
