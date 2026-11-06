-- Migration: Initialize Asisten Legalitas UMKM Schema
-- Created: 2026-11-03
-- Stores: Rules metadata, Feedback (no personal data per UU PDP 27/2022)

CREATE TABLE IF NOT EXISTS perizinan_rules (
    id TEXT PRIMARY KEY,
    kategori TEXT NOT NULL,
    nama_izin TEXT NOT NULL,
    penerbit TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    kriteria_json JSONB NOT NULL,
    syarat_dokumen_json JSONB NOT NULL,
    terakhir_diperbarui DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_anonim (
    id SERIAL PRIMARY KEY,
    skor_kemudahan INTEGER NOT NULL CHECK (skor_kemudahan >= 1 AND skor_kemudahan <= 5),
    pesan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perizinan_rules_kategori ON perizinan_rules(kategori);
CREATE INDEX idx_feedback_created_at ON feedback_anonim(created_at);
