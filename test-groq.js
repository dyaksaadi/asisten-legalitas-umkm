const { default: axios } = await import('axios');
const { default: dotenv } = await import('dotenv');
dotenv.config();

try {
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: process.env.OPENAI_MODEL || 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'test' }]
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  });
  console.log('SUCCESS:', res.data.choices[0].message.content);
} catch (err) {
  console.error('ERROR:', err.response?.data || err.message);
}
