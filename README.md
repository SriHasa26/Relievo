# ReliefRelay

AI-assisted disaster-response coordination. Citizens report, a coordinator verifies and approves explainable
volunteer matches, and responders talk in incident rooms built on the Nexconn Chat SDK.
Hackathon: Nexconn Build Challenge 2026 (Humanitarian & Social Good).
Plan: [docs/UNDERSTANDING.md](docs/UNDERSTANDING.md) · Rules: [CLAUDE.md](CLAUDE.md)

> AI is decision support. A human coordinator verifies every incident and approves every assignment.
> All demo data is synthetic and labelled so.

## Run (MOCK_MODE, no keys needed)

```bash
npm install
cp backend/.env.example backend/.env      # MOCK_MODE=true
cp frontend/.env.example frontend/.env
npm run dev                               # API :4000, web :5173 (Vite proxies /api)
npm test                                  # 48 backend unit tests
npm run typecheck
```

Open http://localhost:5173 and use the **demo role switcher** (all passwords `demo1234`).
Data lives in memory and resets when the backend restarts.

### Two-account demo (chat)
Each browser **tab** keeps its own login (sessionStorage). Open two tabs on the same origin, e.g.
Coordinator Priya in one and Sana Khan (volunteer) in the other. The mock chat links the tabs through
`BroadcastChannel`. In real mode the same two-tab setup works through Nexconn.

### Suggested click-through
1. Citizen Asha: *New request*, send the text, see the report.
2. Coordinator: *Command centre* → open it → compare original vs AI → edit → **Verify**.
3. *Responder dispatch*: ranked volunteers with the D/K/A/C breakdown; busy and unverified volunteers are excluded with reasons. **Approve**.
4. Volunteer Sana: **Accept**. Both open the incident: group room and a direct message.
5. Coordinator: allocate stock on *Resources*, **Mark resolved**, then see the timeline and *Impact*.

## Matching (ResponderMatch)
`S = 0.35·D + 0.30·K + 0.20·A + 0.15·C`, each 0-100 (`backend/src/services/matching.ts`).
D = 100 at 0 km falling to 0 at 10 km (Haversine). K = share of the category's skills the volunteer has.
A = 100 if free, 60 if already holding a task. C = free slots / capacity.
Excluded outright: unverified, busy/offline, at capacity, declined this incident, and no `medical` /
`rescue_certified` qualification for medical / rescue tasks.

## Layout
```
backend/   Express + TS. services/ (extraction, matching, incidents, dispatch, rooms, resources, metrics)
           integrations/nexconn.adapter.ts   <- only backend file that touches Nexconn
frontend/  React + Vite + Tailwind. integrations/nexconnClient.ts   <- only frontend file that touches Nexconn
supabase/  migrations (schema + RLS)
```

## Status: MOCK_MODE only
Done: intake, mock/keyword AI with schema validation, verify/reject/edit, matching and dispatch,
accept/decline/reassign/resolve, rooms + DMs (mock), resources, impact, timeline, event log.

Not wired yet (by design):
- Real Nexconn (every adapter function has a `// TODO(nexconn)` marker).
- Real Gemini (`geminiExtract` in `extraction.ts`; falls back to keywords).
- Supabase at runtime: schema and RLS are in `supabase/migrations`, and `npm run seed:supabase -w backend`
  exists but is **untested** (no project yet). The API currently reads the in-memory store and uses mock sessions
  (`auth.ts`), so a real-mode store and JWT verification still have to be written.
- Voice input (SHOULD), deployment.

Known mock limits: system messages posted by the backend adapter do not appear in the frontend mock chat.
Seeded demo: 4 volunteers (the brief said 3; a fourth available one makes the matching list meaningful).
