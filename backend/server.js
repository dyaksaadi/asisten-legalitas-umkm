import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import axios from 'axios';
import { tentukanIzin, buatChecklist, isiFormDemo } from './rulesEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3002;
let dbClient = null;

const rulesJsonPath = path.join(__dirname, '..', 'database', 'rules.json');
let rulesData = {};
try {
  rulesData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf8'));
} catch (err) {
  console.warn('Unable to read rules.json:', err.message);
}

const specialistGuide = Object.fromEntries(
  (rulesData.kategori_izin || []).map((item) => [item.id, item])
);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function stripMarkdownSummary(text = '') {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function normalizeFeedbackScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 5;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

async function callAi(message, history = [], selectedIzin = null) {
  // Use OPENAI_API_KEY (Groq via OpenAI compatibility layer)
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.OPENAI_MODEL || 'openai/gpt-oss-20b';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const normalizedHistory = Array.isArray(history) ? history.slice(-4) : [];
  const messages = [
    ...normalizedHistory
      .filter((entry) => entry && typeof entry.text === 'string')
      .map((entry) => ({
        role: entry.type === 'user' ? 'user' : 'assistant',
        content: entry.text
      })),
    { role: 'user', content: String(message || '') }
  ];

  const systemPrompt = `Anda adalah Asisten Legalitas UMKM Indonesia. Jawab HANYA menggunakan format paragraf dan daftar poin (bullet list) biasa. JANGAN PERNAH gunakan tabel markdown (garis vertikal | atau garis horizontal ---). Jawab singkat, jelas, dan relevan untuk perizinan usaha makanan (NIB, SPP-IRT, BPOM, Halal). Jangan minta NIK/password/OTP.`;

  console.log('callAi params:', { message, historyLength: history?.length, selectedIzin });
  console.log('messages array:', JSON.stringify(messages));

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let content = response.data.choices?.[0]?.message?.content?.trim() || '';
    
    // Aggressive cleanup: hapus semua baris yang mengandung dash berderet atau pipe
    const lines = content.split('\n').filter(line => {
      const t = line.trim();
      if (!t) return true;
      if (t.includes('---')) return false;
      if (/^[-]+$/.test(t)) return false;
      if (/^(No|Persyaratan|Cara|Catatan|Izin|Keterangan|Langkah|Dokumen|Penjelasan|Instansi|Proses|Perizinan)/i.test(t)) return false;
      if (/^[\|\s\-:]+$/.test(t)) return false;
      return true;
    });
    
    content = lines.join('\n').trim();
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    return content;
  } catch (err) {
    console.error('Full AI error:', err.response?.data || err.message);
    console.error('Status:', err.response?.status);
    throw new Error(`AI error: ${err.message}`);
  }
}
async function initDB() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('DATABASE_URL not configured. Running in demo mode.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  client.on('error', (err) => {
    console.warn('Postgres client error:', err.message);
    if (dbClient === client) {
      dbClient = null;
    }
  });

  try {
    await client.connect();
    dbClient = client;
    console.log('âœ… Connected to Neon Postgres');
  } catch (err) {
    console.error('DB connection failed:', err.message);
    dbClient = null;
  }
}

app.get('/api/rules', (req, res) => {
  res.json({ success: true, data: rulesData });
});

app.post('/api/tentukan-izin', (req, res) => {
  try {
    const inputData = req.body || {};
    const hasil = tentukanIzin(inputData);
    res.json({ success: true, data: hasil });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan sistem dalam menentukan izin.',
      detail: err.message
    });
  }
});

app.get('/api/izin-detail/:id', (req, res) => {
  const { id } = req.params;
  const izin = (rulesData.kategori_izin || []).find((k) => k.id === id) || specialistGuide[id];

  if (!izin) {
    return res.status(404).json({
      success: false,
      error: `Izin dengan ID ${id} tidak ditemukan`
    });
  }

  res.json({ success: true, data: izin });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], selectedIzin = null } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong.' });
    }

    const text = String(message).toLowerCase();
    let extracted = {
      nama_produk: 'Produk Makanan UMKM',
      jenis_produk: 'makanan',
      kondisi_produk: 'kering',
      masa_simpan_hari: 14,
      suhu_penyimpanan: 'suhu_ruang',
      kandungan_susu_daging_kaleng: false,
      klaim_khasiat: false,
      skala_usaha: 'mikro'
    };

    if (text.includes('keripik') || text.includes('kue kering') || text.includes('sambal kering')) {
      extracted.jenis_produk = 'Keripik / Olahan Kering';
      extracted.kondisi_produk = 'kering';
      extracted.masa_simpan_hari = 30;
    } else if (text.includes('beku') || text.includes('frozen') || text.includes('nugget')) {
      extracted.jenis_produk = 'Makanan Beku';
      extracted.kondisi_produk = 'beku';
      extracted.suhu_penyimpanan = 'beku';
      extracted.masa_simpan_hari = 90;
    } else if (text.includes('susu') || text.includes('keju') || text.includes('kaleng')) {
      extracted.jenis_produk = 'Olahan Susu / Daging / Kaleng';
      extracted.kandungan_susu_daging_kaleng = true;
    }

    if (text.includes('obat') || text.includes('sehat') || text.includes('menyembuhkan')) {
      extracted.klaim_khasiat = true;
    }

    const analisisIzin = tentukanIzin(extracted);
    let responseText = '';

    console.log('About to call AI with:', { apiKey: process.env.OPENAI_API_KEY ? 'set' : 'missing', baseUrl: process.env.OPENAI_BASE_URL, model: process.env.OPENAI_MODEL });
    const aiReply = await callAi(message, history, selectedIzin);
    console.log('AI reply received:', aiReply ? aiReply.substring(0, 50) : 'empty');
    if (aiReply && aiReply.trim()) {
      responseText = aiReply;
    } else {
      console.warn('AI returned empty response');
    }

    if (!responseText && selectedIzin && specialistGuide[selectedIzin]) {
      const izinData = specialistGuide[selectedIzin];
      const isQuestion = /tanya|berapa|gimana|bagaimana|apa|boleh|bisa|tidak|jangan|kenapa|mengapa/i.test(message);

      if (isQuestion) {
        let answered = false;
        const faqList = Array.isArray(izinData.FAQ) ? izinData.FAQ : [];

        for (const faq of faqList) {
          const faqText = faq.pertanyaan?.toLowerCase() || '';
          if (faqText.includes(text.substring(0, 50)) || text.includes(faqText.substring(0, 20))) {
            responseText = `**${faq.pertanyaan}**\n\n${faq.jawaban}`;
            answered = true;
            break;
          }
        }

        if (!answered) {
          if (text.includes('berapa') || text.includes('biaya')) {
            responseText = `**Biaya ${izinData.nama}:** ${izinData.biaya}\n\nWaktu proses: ${izinData.estimasi_waktu || 'Bervariasi'}`;
          } else if (text.includes('berapa lama') || text.includes('waktu')) {
            responseText = `**Waktu Proses ${izinData.nama}:** ${izinData.estimasi_waktu || 'Bervariasi'}\n\nBiaya: ${izinData.biaya}`;
          } else if (text.includes('syarat') || text.includes('persyaratan')) {
            responseText = `**Syarat ${izinData.nama}:**\n${(izinData.persyaratan_dokumen || []).map((s) => `- ${s}`).join('\n')}`;
          } else {
            responseText = `**${izinData.nama}**\n\n${izinData.deskripsi}\n\nBiaya: ${izinData.biaya}\nWaktu: ${izinData.estimasi_waktu || 'Bervariasi'}`;
          }
        }
      } else {
        responseText = `**${izinData.nama}**\n\n${izinData.deskripsi}\n\nBiaya: ${izinData.biaya}\nWaktu: ${izinData.estimasi_waktu || 'Bervariasi'}`;
      }
    }

    if (!responseText) {
      responseText = `Halo! Berdasarkan produk Anda (${extracted.jenis_produk}), berikut izin yang diperlukan:\n`;
      analisisIzin.urutan_izin.forEach((item, idx) => {
        responseText += `\n${idx + 1}. **${item.nama}** (${item.penerbit})\n   Biaya: ${item.biaya}`;
      });
    }

    if (dbClient) {
      try {
        await dbClient.query(
          'INSERT INTO feedback_anonim (skor_kemudahan, pesan) VALUES ($1, $2)',
          [normalizeFeedbackScore(0), `Query: ${message.substring(0, 100)}`]
        );
      } catch (err) {
        console.warn('Feedback log failed:', err.message);
      }
    }

    res.json({
      success: true,
      data: {
        reply: stripMarkdownSummary(responseText),
        extracted_data: extracted,
        analisis_izin: analisisIzin
      }
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada layanan Chat Agent.',
      detail: err.message
    });
  }
});

app.post('/api/checklist', (req, res) => {
  const { izin_ids = ['NIB', 'SPP-IRT', 'HALAL-SELF-DECLARE'] } = req.body;
  const checklist = buatChecklist(izin_ids);
  res.json({ success: true, data: checklist });
});

app.post('/api/form-demo', (req, res) => {
  const data = req.body || {};
  const result = isiFormDemo(data);
  res.json({ success: true, data: result });
});

app.post('/api/feedback', async (req, res) => {
  const { skor = 5, pesan = '' } = req.body;
  if (dbClient) {
    try {
      await dbClient.query('INSERT INTO feedback_anonim (skor_kemudahan, pesan) VALUES ($1, $2)', [normalizeFeedbackScore(skor), pesan]);
    } catch (err) {
      console.error('Feedback insert failed:', err.message);
      return res.status(500).json({ success: false, error: 'Gagal menyimpan feedback' });
    }
  }

  res.json({ success: true, message: 'Terima kasih atas masukan Anda!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbClient ? 'connected' : 'disconnected',
    ai: process.env.OPENAI_API_KEY ? 'openai' : 'unconfigured'
  });
});

const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Backend Asisten Legalitas UMKM berjalan di port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
  });
})();




