# ReliefRelay

AI-assisted disaster-response coordination: citizen reports become structured incidents, a coordinator verifies them and approves explainable volunteer matches, and responders talk in incident rooms built on the Nexconn Chat SDK. Built for the Nexconn Build Challenge 2026 (Humanitarian & Social Good), deadline 22 Nov 2026. Plan and rationale: `docs/UNDERSTANDING.md`; source blueprint: `docs/ReliefRelay_Blueprint.pdf`.

Stack: React + TypeScript + Vite (frontend), Node.js + Express (backend), Supabase (Postgres + Auth + RLS), Gemini (structured JSON), Nexconn Chat SDK, Leaflet + OpenStreetMap (no API key). Modular monolith.

## Scope

**MUST**
- Text emergency intake form with a large-text accessibility toggle
- Gemini structured-JSON extraction, original report shown beside it
- Coordinator verify/reject
- Deterministic explainable matching, `S = 0.35D + 0.30K + 0.20A + 0.15C`; busy or unverified volunteers are hard-excluded; coordinator approval and reassignment
- Incident group room plus coordinator-volunteer DMs between two separate logged-in accounts, via the adapter
- Volunteer accept/decline
- Status timeline from `incident_events`; minimal impact dashboard computed from `incident_events`
- Leaflet incident map (seeded lat/lng, Haversine distance)
- Seed data (3 coordinators/volunteers/citizens, ~8 incidents), all labelled synthetic
- Keyword fallback extractor when Gemini fails

**SHOULD**
- Browser voice-to-text on the intake form (Web Speech API)
- Minimal resource list with one allocate-to-incident action
- Same-category-nearby duplicate flag

**CUT**
- Clustering/hotspots, image sharing, NGO rooms and portal, community channels, low-stock alerts, Call SDK, custom WebSocket chat, Google Maps, Nominatim (stretch only; 1 req/s, send a User-Agent)

## Nexconn adapter rule

All Nexconn calls live in exactly two files, and nothing else may import Nexconn:
- `backend/src/integrations/nexconn.adapter.ts`: issue user token, create group, add/remove members, post system message
- `frontend/src/integrations/nexconnClient.ts`: init, connect with token, join room, send/receive messages, history

Each exported function has a typed signature, a `MOCK_MODE` implementation and a `// TODO(nexconn): paste real SDK call here` marker. Never guess an SDK method name or endpoint; leave the placeholder. The UI uses our own `ChatMessage` type, never SDK types.

## Environment variables

Backend `.env.example`:
```
NEXCONN_APP_KEY=paste your api
NEXCONN_APP_SECRET=paste your api
GEMINI_API_KEY=paste your api
SUPABASE_URL=paste your api
SUPABASE_ANON_KEY=paste your api
SUPABASE_SERVICE_ROLE_KEY=paste your api
MOCK_MODE=true
```
Frontend `.env.example` (public values only, `VITE_` prefix): `VITE_NEXCONN_APP_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`, `VITE_MOCK_MODE`. Never commit real `.env` files.

## MOCK_MODE rule

`MOCK_MODE=true` is dev-only: fake AI output and an in-memory chat stub so the app runs before keys exist. It must be `false` for the demo, the deployed build and the recorded video. `/api/health` and the UI must visibly show when mock mode is on.

## Security rules

- `NEXCONN_APP_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` exist only on the backend; never in frontend code, bundles or logs.
- The backend issues chat tokens, creates groups and enforces membership. The token userId comes only from the verified Supabase JWT, never from the request body.
- Group membership is derived from `assignments` (coordinator + approved volunteer). `/room` re-checks it. Group ids are opaque UUIDs.
- Supabase is the source of truth; Nexconn carries conversations only. Membership changes go through one service function (DB write, then adapter call, with a retry/resync path on failure).
- Supabase RLS: citizens see their own requests, volunteers see assigned incidents, coordinators see all.
- Direct messages are limited to the coordinator-volunteer pairs returned by `/api/chat/contacts`.

## Product rule

**AI is decision support; a human coordinator verifies and approves every assignment.** The system must not declare an area safe, make medical decisions or autonomously dispatch. All demo data is synthetic and labelled so; never present simulated activity as real-world impact.
