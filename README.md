# ReliefRelay

AI-assisted disaster-response coordination. Citizens report, a coordinator verifies and approves explainable
volunteer matches, and responders talk in Nexconn incident rooms. Hackathon: Nexconn Build Challenge 2026.
Plan: [docs/UNDERSTANDING.md](docs/UNDERSTANDING.md). Rules: [CLAUDE.md](CLAUDE.md).

## Run (MOCK_MODE, no keys needed)

```bash
npm install
cp backend/.env.example backend/.env      # MOCK_MODE=true
cp frontend/.env.example frontend/.env
npm run dev                               # API on :4000, web on :5173
npm test                                  # backend unit tests
npm run typecheck
```

Open http://localhost:5173 and use the **demo role switcher**. All data is synthetic and resets when the
backend restarts. Each browser tab has its own login, so two tabs = two accounts (needed for the chat demo).
All demo passwords: `demo1234`.

## Status: MOCK_MODE only
- Data: in-memory store seeded from `backend/src/store/seedData.ts`.
- Auth: mock sessions (Supabase Auth not wired yet).
- AI: keyword extractor (Gemini not wired yet). Chat: in-memory stub (real Nexconn not wired yet).
- Supabase: schema + RLS in `supabase/migrations`, seed script `npm run seed:supabase -w backend` (untested, no project yet).
- Nexconn is only touched in `backend/src/integrations/nexconn.adapter.ts` and `frontend/src/integrations/nexconnClient.ts`.
