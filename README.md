# Asisten Legalitas UMKM

AI Agent Pendamping Pengurusan NIB, SPP-IRT, dan Halal untuk Usaha Makanan

**Status**: ✓ Operational (Neon Postgres + GROK AI)

## Deskripsi

Sistem AI yang membantu pelaku UMKM makanan Indonesia menentukan izin usaha (NIB, SPP-IRT, BPOM, Sertifikasi Halal) berdasarkan regulasi terkini (Peraturan BPOM No. 4/2024, UU PDP No. 27/2022), tanpa mengumpulkan atau menyimpan data pribadi pengguna.

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: Neon Lakebase Postgres (pooled & unpooled)
- **AI**: GROK (xAI) via grok-2 model
- **IaC**: neon.ts (Neon infrastructure as code)

## Setup & Run

### Prerequisites

```bash
node v26+ 
npm 11+
neon CLI (installed globally)
.env.local dengan DATABASE_URL & GROK_API_KEY
```

### Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### Database Migration

```bash
node database/migrate.js
```

Membuat schema: `perizinan_rules`, `feedback_anonim` di Neon Postgres.

### Start Backend

```bash
npm run dev
# atau
node backend/server.js
```

Backend berjalan di port 3001, serve frontend dari `frontend/dist/`.

### Build Frontend

```bash
cd frontend
npm run build
cd ..
```

Output: `frontend/dist/` (production bundle).

## API Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/health` | - | `{status, db, grok}` |
| GET | `/api/rules` | - | Semua aturan perizinan |
| POST | `/api/chat` | `{message, history}` | GROK reply + analisis izin |
| POST | `/api/tentukan-izin` | `{jenis_produk, ...}` | Urutan izin + dokumen |
| POST | `/api/checklist` | `{izin_ids}` | Daftar dokumen per izin |
| POST | `/api/feedback` | `{skor, pesan}` | Tersimpan ke DB |

## Deployment (Neon)

### Link Project

```bash
neon link --org-id org-lingering-glitter-69530732 --project-id muddy-dew-61388884
```

### Deploy Config

```bash
neon deploy
```

Reconcile `neon.ts` policy dengan branch production.

### Env Management

```bash
neon env pull           # pull env vars
neon checkout dev --create  # switch branch
```

## Environment Variables

```
DATABASE_URL=postgresql://...  # pooled connection
DATABASE_URL_UNPOOLED=postgresql://...  # direct connection
NEON_BRANCH=production
GROK_API_KEY=grok_5793502330967efd1285c2db6f0076e6_...
PORT=3001  # optional
```

Disimpan di `.env.local` (git-ignored).

## Privacy & Security

✓ **Privacy by Design** (UU PDP No. 27/2022):
- Tidak menyimpan NIK, password, atau data identitas
- Chat history hanya di memory saat sesi aktif
- Feedback anonim, tidak link ke user
- Peringatan UI: jangan ketik data sensitif

✓ **Database Security**:
- Neon SSL/TLS (sslmode=require)
- IP allow list optional
- Parameterized queries (pg library)

## Rule Engine

Deterministic decision tree (if/else, bukan AI):
1. Extract product info dari user message (keyword detection)
2. Rule: kondisi produk → kategori izin (NIB → SPP-IRT/BPOM → Halal)
3. Generate checklist dokumen per izin
4. GROK AI: natural language explanation

Aturan disimpan di `database/rules.json`, mudah diupdate saat regulasi berubah.

## Testing

### Health Check

```bash
curl http://localhost:3001/api/health
# {"status":"ok","db":"connected","grok":"configured"}
```

### Chat Test

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Saya buat keripik pisang, kemasan sendiri, 2 minggu","history":[]}'
```

### Feedback Insert

```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"skor":5,"pesan":"Sangat membantu"}'
```

## File Structure

```
.
├── backend/
│   ├── server.js           # Express app + Neon + GROK
│   └── rulesEngine.js      # Deterministic rule logic
├── database/
│   ├── rules.json          # Aturan perizinan (BPOM 4/2024)
│   ├── migration-001-init.sql
│   └── migrate.js          # Schema provisioning
├── frontend/
│   ├── src/App.jsx         # React UI (chat + results panel)
│   ├── index.html
│   ├── package.json
│   └── dist/               # Production build
├── .env.local              # Secrets (git-ignored)
├── .neon                   # Neon project link
├── neon.ts                 # IaC config
├── package.json
└── LICENSE, README.md
```

## Known Limitations

- Free Neon plan: AI Gateway blocked (using external GROK API instead)
- GROK response time: ~1-2s per chat message
- Feedback not timestamped detail (only created_at)
- No user auth (anonim by design)

## Future Enhancements

- [ ] Realtime live queries (Neon Realtime beta)
- [ ] Form prefill dengan extracted data
- [ ] Multi-language support
- [ ] Analytics dashboard (Neon + Grafana)
- [ ] Mobile app (React Native)

## References

- Peraturan BPOM No. 4/2024: https://peraturan.bpk.go.id/Details/282151/peraturan-bpom-no-4-tahun-2024
- UU PDP 27/2022: https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
- OSS RBA: https://oss.go.id/id/panduan
- Neon Docs: https://neon.com/docs
- GROK API: https://docs.x.ai/api/

## License

MIT © 2026 Dyaksa Adi Pradana - Tim GTNIC Universitas Negeri Jember

## Support

Issue? Check `.env.local`, run `neon env pull`, restart backend.

```bash
neon feedback --message "Brief issue description"
```

---

**Last Updated**: 2026-11-03  
**Neon Branch**: production (br-fancy-tree-bdz76ybi)  
**Status**: ✓ Active
