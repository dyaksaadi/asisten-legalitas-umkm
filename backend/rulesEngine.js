import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Rules JSON
const rulesPath = path.join(__dirname, '../database/rules.json');
let rulesData = {};
try {
  rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
} catch (e) {
  console.error('Gagal membaca rules.json:', e.message);
}

/**
 * Deterministic Rule Engine for Perizinan UMKM Makanan
 * Peraturan BPOM No 4/2024 & Panduan OSS RBA 2026
 */
export function tentukanIzin(userInput) {
  const {
    nama_produk = '',
    jenis_produk = '',
    kondisi_produk = 'kering', // 'kering' | 'basah' | 'beku'
    kandungan_susu_daging_kaleng = false,
    klaim_khasiat = false,
    masa_simpan_hari = 14,
    suhu_penyimpanan = 'suhu_ruang', // 'suhu_ruang' | 'dingin' | 'beku'
    tempat_produksi = 'rumah', // 'rumah' | 'pabrik'
    status_nib = false,
    skala_usaha = 'mikro', // 'mikro' | 'kecil' | 'menengah'
    bahan_halal_jelas = true
  } = userInput;

  const alurIzin = [];
  const alasan = [];
  const peringatan = [];

  // Step 1: NIB selalu required pertama
  if (!status_nib) {
    alurIzin.push({
      tahap: 1,
      id: 'NIB',
      nama: 'Nomor Induk Berusaha (NIB)',
      penerbit: 'Kementerian Investasi / BKPM via OSS RBA',
      biaya: 'Gratis',
      status: 'Wajib Pertama',
      deskripsi: 'NIB adalah identitas legalitas primer usaha. Harus dimiliki sebelum izin lainnya.'
    });
    alasan.push('Setiap kegiatan usaha makanan di Indonesia wajib memiliki NIB terlebih dahulu via OSS RBA.');
  } else {
    alasan.push('Pelaku usaha sudah memiliki NIB. Dapat langsung melanjut ke tahap Izin Edar.');
  }

  // Step 2: BPOM MD vs SPP-IRT Decision Tree
  const isHighRisk = 
    kondisi_produk.toLowerCase() === 'beku' ||
    suhu_penyimpanan.toLowerCase() === 'beku' ||
    suhu_penyimpanan.toLowerCase() === 'dingin' ||
    Boolean(kandungan_susu_daging_kaleng) ||
    Boolean(klaim_khasiat) ||
    Number(masa_simpan_hari) < 7 ||
    tempat_produksi.toLowerCase() === 'pabrik';

  if (isHighRisk) {
    alurIzin.push({
      tahap: status_nib ? 1 : 2,
      id: 'BPOM-MD',
      nama: 'Izin Edar BPOM (MD)',
      penerbit: 'Badan Pengawas Obat dan Makanan (BPOM)',
      biaya: 'Sesuai PNBP BPOM',
      status: 'Diperlukan (Risiko Tinggi)',
      deskripsi: 'Produk tidak memenuhi syarat SPP-IRT karena termasuk kategori makanan berisiko/beku/berpengawet/klaim khusus.'
    });

    if (kondisi_produk.toLowerCase() === 'beku' || suhu_penyimpanan.toLowerCase() === 'beku') {
      alasan.push('Produk beku (frozen food) wajib memiliki Izin Edar BPOM MD dan TIDAK BISA menggunakan SPP-IRT.');
    }
    if (kandungan_susu_daging_kaleng) {
      alasan.push('Produk dengan olahan susu murni, daging olahan, atau sterilisasi kaleng wajib Izin Edar BPOM MD.');
    }
    if (Number(masa_simpan_hari) < 7) {
      alasan.push('Masa simpan kurang dari 7 hari pada suhu ruang diarahkan ke izin BPOM atau dijual segar/langsung.');
    }
    if (klaim_khasiat) {
      alasan.push('Produk dengan klaim khasiat kesehatan wajib pengawasan langsung dari BPOM.');
    }
  } else {
    alurIzin.push({
      tahap: status_nib ? 1 : 2,
      id: 'SPP-IRT',
      nama: 'Sertifikat Produksi Pangan Industri Rumah Tangga (SPP-IRT)',
      penerbit: 'Dinas Kesehatan Kab/Kota via Portal SPPIRT BPOM',
      biaya: 'Gratis',
      status: 'Rekomendasi (Risiko Rendah)',
      deskripsi: 'Produk memenuhi syarat Peraturan BPOM No. 4/2024 untuk skala rumah tangga.'
    });
    alasan.push('Produk tergolong pangan kering/suhu ruang, masa simpan ≥ 7 hari, tanpa olahan daging/susu sensitif. Cocok untuk SPP-IRT.');
  }

  // Step 3: Halal Certification Decision Tree
  const isSelfDeclareEligible = 
    (skala_usaha === 'mikro' || skala_usaha === 'kecil') &&
    bahan_halal_jelas &&
    !klaim_khasiat;

  if (isSelfDeclareEligible) {
    alurIzin.push({
      tahap: status_nib ? 2 : 3,
      id: 'HALAL-SELF-DECLARE',
      nama: 'Sertifikat Halal Gratis (Jalur Self Declare SEHATI)',
      penerbit: 'BPJPH Kementerian Agama',
      biaya: 'Gratis (Program SEHATI)',
      status: 'Sangat Direkomendasikan',
      deskripsi: 'Sertifikasi halal cuma-cuma untuk usaha mikro/kecil dengan bahan terkonfirmasi halal.'
    });
    alasan.push('Usaha Anda memenuhi syarat program SEHATI (Self Declare) BPJPH: skala mikro/kecil dan bahan baku tidak berisiko.');
  } else {
    alurIzin.push({
      tahap: status_nib ? 2 : 3,
      id: 'HALAL-REGULER',
      nama: 'Sertifikat Halal Jalur Reguler',
      penerbit: 'BPJPH & Lembaga Pemeriksa Halal (LPH)',
      biaya: 'Tarif Resmi BPJPH & LPH',
      status: 'Jalur Alternatif',
      deskripsi: 'Diperlukan jika bahan baku kompleks atau skala usaha menengah ke atas.'
    });
    alasan.push('Proses sertifikasi halal membutuhkan pemeriksaan audit LPH karena kompleksitas bahan/skala usaha.');
  }

  // Privacy Warning per UU PDP No 27/2022
  peringatan.push('PRIVASI: Jangan pernah memberikan NIK E-KTP, Password OSS, atau OTP kepada siapapun termasuk AI Agent.');
  peringatan.push('Sistem ini memandu persiapan & kelayakan, bukan mendaftarkan atas nama pengguna. Pendaftaran resmi dilakukan sendiri di oss.go.id.');

  // Generate document checklist
  const checklist = buatChecklist(alurIzin.map(item => item.id));

  return {
    timestamp: new Date().toISOString(),
    aturan_versi: rulesData.terakhir_diperbarui || '2026-10-29',
    input_pengguna: {
      nama_produk,
      jenis_produk,
      kondisi_produk,
      masa_simpan_hari,
      suhu_penyimpanan,
      skala_usaha
    },
    urutan_izin: alurIzin,
    alasan_keputusan: alasan,
    peringatan,
    checklist_dokumen: checklist
  };
}

/**
 * Generate document checklist based on needed permissions
 */
export function buatChecklist(izinIds = []) {
  const result = [];
  const allCategories = rulesData.kategori_izin || [];

  for (const id of izinIds) {
    const found = allCategories.find(c => c.id === id);
    if (found) {
      result.push({
        izin_id: found.id,
        nama_izin: found.nama,
        penerbit: found.penerbit,
        biaya: found.biaya,
        dokumen: found.persyaratan_dokumen || []
      });
    }
  }

  return result;
}

/**
 * Generate Demo Data Form
 */
export function isiFormDemo(dataContoh = {}) {
  return {
    pesan: 'Formulir Tiruan NIB OSS (Hanya Peragaan / Demo)',
    data_isi: {
      nama_pemilik: dataContoh.nama || '[NAMA LENGKAP - DIISI PENGGUNA SENDIRI]',
      nik: '[NIK DIRT - JANGAN SIMPAN]',
      no_hp: dataContoh.no_hp || '[NOMOR HP PENGGUNA]',
      email: dataContoh.email || '[EMAIL PENGGUNA]',
      nama_usaha: dataContoh.nama_usaha || 'Dapur Berkah UMKM',
      kbli: '10799 - Industri Produk Makanan Lainnya',
      modal_usaha: 'Rp 5.000.000 (Skala Mikro)',
      alamat_usaha: 'Jl. Mastrip No. 10, Jember, Jawa Timur',
      status_npwp: 'Sudah / Memiliki NPWP'
    },
    catatan_keamanan: 'Kolom identitas rahasia dikosongkan agar diisi sendiri oleh pengguna di portal resmi oss.go.id.'
  };
}
