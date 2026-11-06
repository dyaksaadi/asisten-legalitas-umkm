import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const grokApiKey = process.env.GROK_API_KEY;
console.log('GROK_API_KEY loaded:', grokApiKey ? 'yes' : 'no');

if (!grokApiKey) {
  console.error('GROK_API_KEY tidak ditemukan di .env.local');
  process.exit(1);
}

(async () => {
  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-2',
        messages: [
          { role: 'system', content: 'Anda adalah AI Asisten. Jawab singkat.' },
          { role: 'user', content: 'Berapa biaya NIB?' }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${grokApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      }
    );

    const reply = response?.data?.choices?.[0]?.message?.content;
    console.log('✅ Grok response:', reply);
  } catch (err) {
    console.error('❌ Grok error:', err.response?.data || err.message);
  }
})();
