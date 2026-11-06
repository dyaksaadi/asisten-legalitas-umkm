import { neon } from '@neondatabase/serverless';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path.startsWith('/api/')) {
      const apiCors = { ...corsHeaders, 'Content-Type': 'application/json' };
      const connectionString = env.DATABASE_URL;
      const sql = connectionString ? neon(connectionString) : null;

      try {
        if (path === '/api/health') {
          return new Response(JSON.stringify({
            status: 'ok',
            db: sql ? 'connected' : 'disconnected',
            ai: env.OPENAI_API_KEY ? 'openai' : 'unconfigured'
          }), { headers: apiCors });
        }

        if (path.startsWith('/api/izin-detail/')) {
          const izinId = decodeURIComponent(path.split('/api/izin-detail/')[1]);
          const details = {
            'NIB': {
              id: 'NIB',
              nama: 'Nomor Induk Berusaha (NIB)',
              penerbit: 'Kementerian Investasi / BKPM via OSS RBA',
              biaya: 'Gratis',
              estimasi_waktu: '10 - 15 Menit',
              alur_proses: [
                { tahap: 1, nama: 'Persiapan Dokumen', durasi: '1-2 jam', detail: ['Siapkan NIK E-KTP (pastikan terdaftar di Dukcapil)', 'Siapkan email aktif', 'Siapkan nomor HP/WhatsApp aktif', 'Jika ada NPWP, siapkan juga', 'Tentukan nama usaha & alamat usaha'] },
                { tahap: 2, nama: 'Login OSS RBA', durasi: '5-10 menit', detail: ['Buka https://oss.go.id', 'Klik \'Daftar\' atau \'Login\'', 'Masukkan email & nomor HP', 'Verifikasi via OTP yang dikirim ke email/SMS', 'Buat password yang aman'] },
                { tahap: 3, nama: 'Isi Formulir NIB', durasi: '15-20 menit', detail: ['Pilih \'Izin Berusaha Utama\'', 'Masukkan data pribadi (nama, NIK, alamat KTP)', 'Masukkan data usaha (nama usaha, KBLI 10799 untuk makanan, alamat usaha)', 'Pilih jenis usaha: \'Perorangan/Mikro\' atau \'Badan Usaha\'', 'Verifikasi data yang sudah diisi'] },
                { tahap: 4, nama: 'Verifikasi Data Dukcapil', durasi: 'Instant', detail: ['Sistem otomatis akan verifikasi NIK ke database Dukcapil', 'Jika terdaftar: lanjut ke tahap berikutnya', 'Jika tidak terdaftar: hubungi Dukcapil terdekat untuk update data'] },
                { tahap: 5, nama: 'Submit & Terbitkan', durasi: 'Instant', detail: ['Klik \'Submit Permohonan\'', 'NIB akan terbit langsung di layar', 'Catat NIB yang sudah terbit', 'Download atau print bukti NIB', 'Simpan baik-baik untuk dokumen izin berikutnya'] }
              ]
            },
            'SPP-IRT': {
              id: 'SPP-IRT',
              nama: 'Sertifikat Produksi Pangan Industri Rumah Tangga (SPP-IRT)',
              penerbit: 'Dinas Kesehatan Kabupaten/Kota (via SPPIRT BPOM / OSS)',
              biaya: 'Gratis',
              estimasi_waktu: '1 - 3 hari kerja',
              alur_proses: [
                { tahap: 1, nama: 'Verifikasi Kelayakan Produk', durasi: '1 jam', detail: ['Cek: produk kering/terkemas, masa simpan ≥7 hari, suhu ruang', 'Jika ada keraguan: hubungi Dinas Kesehatan setempat untuk konsultasi gratis'] },
                { tahap: 2, nama: 'Persiapan Dokumen', durasi: '2-3 hari', detail: ['Siapkan NIB yang sudah terbit', 'Buat denah lokasi produksi (tangan/digital)', 'Siapkan foto lokasi produksi (dapur/ruang produksi)', 'Desain label kemasan dengan informasi wajib', 'Buat daftar komposisi lengkap dengan % berat bahan'] },
                { tahap: 3, nama: 'Ikuti Pelatihan PKP', durasi: '4-8 jam', detail: ['Daftar ke Dinas Kesehatan setempat untuk ikut Pelatihan Penyuluhan Keamanan Pangan (PKP)', 'Pelatihan gratis & sering diadakan setiap bulan', 'Dapatkan sertifikat PKP setelah selesai'] },
                { tahap: 4, nama: 'Submit Permohonan ke Dinas Kesehatan', durasi: '15-30 menit', detail: ['Datang ke Dinas Kesehatan Kabupaten/Kota dengan dokumen lengkap', 'Atau upload via portal SPPIRT BPOM: https://sppirt.bpom.go.id', 'Isi formulir permohonan SPP-IRT', 'Lampirkan semua dokumen persyaratan'] },
                { tahap: 5, nama: 'Verifikasi Lokasi & Inspeksi', durasi: '1-2 hari', detail: ['Petugas Dinas Kesehatan akan berkunjung ke lokasi produksi', 'Mereka akan cek: kebersihan, tata ruang, fasilitas air bersih, tempat sampah', 'Siapkan lokasi rapi & bersih saat inspeksi'] },
                { tahap: 6, nama: 'Terbitkan SPP-IRT', durasi: '1 hari', detail: ['Jika inspeksi lolos: SPP-IRT akan terbit', 'Ambil SPP-IRT di Dinas Kesehatan atau download dari portal', 'SPP-IRT berlaku 2 tahun dari tanggal terbit'] }
              ]
            },
            'HALAL-SELF-DECLARE': {
              id: 'HALAL-SELF-DECLARE',
              nama: 'Sertifikat Halal Gratis (Jalur Self Declare SEHATI)',
              penerbit: 'BPJPH Kementerian Agama',
              biaya: 'Gratis (Rp 0 via Program SEHATI)',
              estimasi_waktu: '12 - 21 hari kerja',
              alur_proses: [
                { tahap: 1, nama: 'Verifikasi Kelayakan Self Declare', durasi: '1 jam', detail: ['Pastikan usaha Anda: mikro atau kecil', 'Semua bahan baku: alam atau sudah bersertifikat halal', 'Proses produksi: sederhana, tidak ada bahan haram'] },
                { tahap: 2, nama: 'Persiapan Dokumen', durasi: '1-2 hari', detail: ['Siapkan NIB & SPP-IRT / izin edar', 'Daftar produk dan bahan baku beserta merk', 'Sertifikat halal bahan baku (jika ada)', 'Matriks/Alur Proses Produksi Halal (PPH)', 'Surat Pernyataan Halal dari Pelaku Usaha'] },
                { tahap: 3, nama: 'Daftar via SIHALAL & Pendampingan', durasi: '3-7 hari', detail: ['Akses ptsp.halal.go.id atau aplikasi SIHALAL', 'Pilih jalur Self Declare', 'Dapatkan pendampingan dari Pendamping PPH (Proses Produk Halal)'] },
                { tahap: 4, nama: 'Verifikasi & Sidang Fatwa', durasi: '7-14 hari', detail: ['Verifikasi oleh Pendamping PPH & MUI', 'Sidang Komite Fatwa Halal', 'Penerbitan Sertifikat Halal resmi oleh BPJPH'] }
              ]
            }
          };
          const detail = details[izinId] || details['NIB'] || Object.values(details)[0];
          return new Response(JSON.stringify({ success: true, data: detail }), { headers: apiCors });
        }

        if (path === '/api/chat' && request.method === 'POST') {
          const body = await request.json();
          const message = body.message || '';

          const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b',
              messages: [
                { role: 'system', content: 'Anda adalah Asisten Legalitas UMKM Indonesia. Berikan panduan NIB, SPP-IRT, dan Halal secara ringkas dan ramah.' },
                { role: 'user', content: message }
              ]
            })
          });

          const aiData = await aiResponse.json();
          if (!aiResponse.ok) {
            throw new Error(aiData.error?.message || 'Groq API error');
          }
          const reply = aiData.choices?.[0]?.message?.content || 'Maaf, gagal memproses AI.';

          return new Response(JSON.stringify({
            success: true,
            data: {
              reply,
              extracted_data: { jenis_produk: message },
              analisis_izin: {
                urutan_izin: [
                  { id: 'NIB', nama: 'Nomor Induk Berusaha (NIB)', penerbit: 'OSS RBA', biaya: 'Gratis' },
                  { id: 'SPP-IRT', nama: 'Sertifikat Produksi Pangan', penerbit: 'BPOM / Dinkes', biaya: 'Gratis' },
                  { id: 'HALAL', nama: 'Sertifikat Halal', penerbit: 'BPJPH', biaya: 'Gratis' }
                ],
                checklist_dokumen: [
                  { nama_izin: 'Nomor Induk Berusaha (NIB)', dokumen: ['NIK E-KTP pemilik', 'NPWP', 'Data usaha'] },
                  { nama_izin: 'Sertifikat Produksi Pangan (SPP-IRT)', dokumen: ['Data produk', 'Foto tempat usaha'] },
                  { nama_izin: 'Sertifikat Halal', dokumen: ['Daftar bahan baku', 'Proses pembuatan'] }
                ],
                peringatan: [
                  'Privasi: Jangan berikan NIK atau OTP kepada siapapun.',
                  'Pengurusan izin resmi dilakukan mandiri di oss.go.id'
                ]
              }
            }
          }), { headers: apiCors });
        }

        return new Response(JSON.stringify({ success: false, error: 'API endpoint not found' }), { status: 404, headers: apiCors });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: apiCors });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
