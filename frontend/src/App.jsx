import { useRef, useEffect, useState } from 'react';
import { Send, FileText, CheckCircle2, AlertCircle, Lock, X, ChevronRight, ShieldCheck, MessageSquareText, Sparkles } from 'lucide-react';

const initialAnalysis = {
  urutan_izin: [
    {
      id: 'NIB',
      nama: 'Nomor Induk Berusaha (NIB)',
      penerbit: 'Kementerian Investasi / BKPM via OSS RBA',
      biaya: 'Gratis',
    },
    {
      id: 'SPP-IRT',
      nama: 'Sertifikat Produksi Pangan Industri Rumah Tangga (SPP-IRT)',
      penerbit: 'Dinas Kesehatan Kab/Kota via Portal SPPIRT BPOM',
      biaya: 'Gratis',
    },
    {
      id: 'HALAL-SELF-DECLARE',
      nama: 'Sertifikat Halal Gratis (Self Declare)',
      penerbit: 'BPJPH Kementerian Agama',
      biaya: 'Gratis (Program SEHATI)',
    }
  ],
  checklist_dokumen: [
    {
      nama_izin: 'Nomor Induk Berusaha (NIB)',
      dokumen: [
        'NIK E-KTP pemilik',
        'NPWP (opsional)',
        'Data usaha (nama, alamat, bidang usaha)',
        'Kegiatan usaha yang dijalankan'
      ]
    },
    {
      nama_izin: 'Sertifikat Produksi Pangan Industri Rumah Tangga (SPP-IRT)',
      dokumen: [
        'Formulir pendaftaran SPPIRT',
        'Foto tempat produksi',
        'Nama produk dan label bahan',
        'Surat pernyataan tidak melanggar ketentuan'
      ]
    },
    {
      nama_izin: 'Sertifikat Halal Gratis (Self Declare)',
      dokumen: [
        'Data bahan baku',
        'Produk jadi yang dipasarkan',
        'Nomor NIB usaha',
        'Pernyataan bahan halal dan proses produksi'
      ]
    }
  ],
  peringatan: [
    'PRIVASI: Jangan pernah memberikan NIK E-KTP, Password OSS, atau OTP kepada siapapun termasuk AI Agent.',
    'Sistem ini memandu persiapan & kelayakan, bukan mendaftarkan atas nama pengguna. Pendaftaran resmi dilakukan sendiri di oss.go.id.',
    'Semua proses UMKM mikro/kecil (NIB & SPP-IRT) umumnya gratis, kecuali kebutuhan khusus atau audit tambahan.'
  ]
};

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Halo! 👋 Saya **Asisten Legalitas UMKM**. Saya membantu Anda menentukan izin apa yang dibutuhkan untuk usaha makanan Anda, tanpa harus memahami regulasi yang rumit.\n\nCukup ceritakan:\n- Jenis produk makanan Anda\n- Kondisi produk (kering/basah/beku)\n- Tempat produksi\n- Status kepemilikan NIB\n\nMulai saja dengan "Saya buat..." atau "Produk saya..."'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIzin, setSelectedIzin] = useState(null);
  const [izinDetail, setIzinDetail] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(initialAnalysis);
  const [showResults, setShowResults] = useState(true);

  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(2);
  const requestInFlightRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedIzin) {
      fetch(`/api/izin-detail/${selectedIzin}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setIzinDetail(data.data);
          }
        })
        .catch((err) => console.error('Fetch detail error:', err));
    }
  }, [selectedIzin]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    const userMessage = inputValue;
    const userMsgId = messageIdRef.current++;
    const botMsgId = messageIdRef.current++;

    setInputValue('');
    setLoading(true);
    setMessages((prev) => [...prev, { id: userMsgId, type: 'user', text: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ type: m.type, text: m.text })),
          selectedIzin: selectedIzin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const botMsg = { id: botMsgId, type: 'bot', text: data.data.reply };
        setMessages((prev) => [...prev, botMsg]);
        setAnalysisResult(data.data.analisis_izin);
        setShowResults(true);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMsg = { id: botMsgId, type: 'bot', text: `❌ Error: ${err.message}` };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      requestInFlightRef.current = false;
    }
  };

  const renderBotText = (rawText) => {
    let html = String(rawText);

    // Remove any remaining markdown artifacts
    html = html.replace(/^[\|\-:\s]{3,}$/gm, '');

    // Bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #b7f3df; font-weight: 700;">$1</strong>');

    // Convert lines
    const lines = html.split('\n');
    const processed = lines.map(line => {
      const t = line.trim();
      if (!t) return '<br />';
      
      // If header-like (e.g. "1. NIB" or "Langkah:")
      if (/^(\d+\.|\w+:)\s*/.test(t) && t.length < 50) {
        return `<div style="margin: 1rem 0 0.4rem; color: #7fe9c6; font-weight: 700; font-size: 1.05em;">${t}</div>`;
      }
      
      // If bullet list
      if (/^[•\-]\s+/.test(t)) {
        const content = t.replace(/^[•\-]\s+/, '');
        return `<div style="margin: 0.3rem 0 0.3rem 1.5rem; color: rgba(255,255,255,0.9); line-height: 1.5;">• ${content}</div>`;
      }
      
      // Regular paragraph
      return `<div style="margin: 0.5rem 0; color: rgba(255,255,255,0.9); line-height: 1.6;">${t}</div>`;
    }).join('');

    return processed;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">
            <span className="brand-icon">
              <MessageSquareText size={18} />
            </span>
            <span className="brand-badge">24H</span>
          </div>
          <div>
            <h1>Asisten Legalitas UMKM</h1>
            <p>Pendamping Pengurusan NIB, SPP-IRT &amp; Halal</p>
          </div>
        </div>

        <div className="privacy-pill">
          <ShieldCheck size={18} />
          <span>Privacy First (UU PDP 27/2022)</span>
        </div>
      </header>

      <main className="content-grid">
        <section className="chat-panel">
          <div className="chat-stream">
            {messages.map((msg) => (
              <div key={msg.id} className={`bubble-row ${msg.type === 'user' ? 'user-row' : 'bot-row'}`}>
                <div
                  className={`message-bubble ${msg.type === 'user' ? 'user-bubble' : 'bot-bubble'}`} 
                  dangerouslySetInnerHTML={{ __html: renderBotText(msg.text) }}
                />
              </div>
            ))}

            {loading && (
              <div className="bubble-row bot-row">
                <div className="message-bubble bot-bubble typing-bubble">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="composer">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ceritakan tentang produk makanan Anda..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !inputValue.trim()}>
              <Send size={20} />
            </button>
          </form>

          <p className="privacy-note">
            <Lock size={14} /> Jangan masukkan NIK, Password, atau nomor identitas apapun ke dalam chat.
          </p>
        </section>

        <aside className="right-panel">
          {analysisResult && showResults && (
            <>
              <div className="info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>
                    <CheckCircle2 size={18} />
                    Urutan Perizinan
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const text = analysisResult.urutan_izin.map((i, idx) => `${idx + 1}. ${i.nama} (${i.penerbit}) - Biaya: ${i.biaya}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Ringkasan izin berhasil disalin ke clipboard!');
                    }}
                    style={{ background: '#0e8f75', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📋 Salin Ringkasan
                  </button>
                </div>
                <div className="list-stack">
                  {analysisResult.urutan_izin.map((izin, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedIzin(izin.id)}
                      className={`list-item ${selectedIzin === izin.id ? 'active' : ''}`}
                    >
                      <div className="item-number">{idx + 1}</div>
                      <div className="item-copy">
                        <div className="item-header">{izin.nama}</div>
                        <div className="item-meta">{izin.penerbit}</div>
                        <div className="item-cost">💰 {izin.biaya}</div>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <h3>
                  <FileText size={18} />
                  Dokumen Diperlukan
                </h3>
                <div className="doc-stack">
                  {analysisResult.checklist_dokumen.map((item, idx) => (
                    <div key={idx} className="doc-group">
                      <div className="doc-title">{item.nama_izin}</div>
                      <ul>
                        {item.dokumen.map((doc, docIdx) => (
                          <li key={docIdx}><span>✓</span>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="warning-card">
                <h4>
                  <AlertCircle size={16} />
                  Peringatan Penting
                </h4>
                <ul>
                  {analysisResult.peringatan.map((warn, idx) => (
                    <li key={idx}>• {warn}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {!showResults && (
            <div className="placeholder-card">
              <FileText size={32} />
              <p>Hasil analisis izin akan muncul di sini</p>
            </div>
          )}
        </aside>
      </main>

      {selectedIzin && izinDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedIzin(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{izinDetail.nama}</h2>
                <p>{izinDetail.penerbit}</p>
              </div>
              <button type="button" onClick={() => setSelectedIzin(null)} aria-label="Close detail">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-summary">
                <p><strong>Biaya:</strong> {izinDetail.biaya}</p>
                <p><strong>Estimasi Waktu:</strong> {izinDetail.estimasi_waktu}</p>
                {izinDetail.id === 'NIB' && <p style={{ marginTop: '0.4rem' }}>🔗 Rujukan Resmi: <a href="https://oss.go.id/id/panduan" target="_blank" rel="noreferrer" style={{ color: '#7fe9c6' }}>oss.go.id/id/panduan</a></p>}
                {izinDetail.id === 'SPP-IRT' && <p style={{ marginTop: '0.4rem' }}>🔗 Rujukan Resmi: <a href="https://sppirt.bpom.go.id" target="_blank" rel="noreferrer" style={{ color: '#7fe9c6' }}>sppirt.bpom.go.id</a></p>}
                {izinDetail.id === 'HALAL-SELF-DECLARE' && <p style={{ marginTop: '0.4rem' }}>🔗 Rujukan Resmi: <a href="https://bpjph.halal.go.id" target="_blank" rel="noreferrer" style={{ color: '#7fe9c6' }}>bpjph.halal.go.id</a></p>}
              </div>

              <div className="detail-section">
                <h3>📋 Alur Proses Lengkap:</h3>
                <div className="step-list">
                  {izinDetail.alur_proses?.map((step, idx) => (
                    <div key={idx} className="step-item">
                      <div className="step-title">Tahap {step.tahap}: {step.nama}</div>
                      <div className="step-time">⏱️ {step.durasi}</div>
                      <ul>
                        {step.detail?.map((detail, detailIdx) => (
                          <li key={detailIdx}><span>•</span>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        Asisten Legalitas UMKM v0.3.0 | Aturan: 2026-10-29 | Panduan: <a href="https://oss.go.id/id/panduan">oss.go.id</a>
      </footer>
    </div>
  );
}
