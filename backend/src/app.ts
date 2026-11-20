import cors from "cors";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { config } from "./config";
import { login, requireAuth, requireRole, toPublic, type AuthedRequest } from "./auth";
import { db } from "./store/store";
import {
  assignVolunteer, matchesFor, reassignVolunteer, resolveIncident, respondToAssignment, setAvailability, volunteerProfile,
} from "./services/dispatch";
import { chatContacts, chatToken, roomAccess } from "./services/rooms";
import { computeMetrics } from "./services/metrics";
import { allocateResource, listResources } from "./services/resources";
import {
  HttpError, incidentDetail, incidentEvents, listIncidents, submitIncident, verifyIncident,
} from "./services/incidents";

type Handler = (req: AuthedRequest, res: Response) => unknown | Promise<unknown>;
/** Lets handlers throw HttpError (sync or async) and have it turned into a JSON error response. */
const wrap = (fn: Handler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req as AuthedRequest, res)).catch(next);
};

const param = (req: Request, name: string) => String(req.params[name]);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true, mockMode: config.mockMode }));

  // ---- auth (mock accounts) ----
  app.post("/api/auth/login", (req, res) => {
    const result = login(String(req.body?.email ?? ""), String(req.body?.password ?? ""));
    if (!result) return void res.status(401).json({ error: "Wrong email or password" });
    res.json(result);
  });

  // Role switcher on the login page: list seeded demo accounts (MOCK_MODE only).
  app.get("/api/auth/demo-users", (_req, res) => {
    if (!config.mockMode) return void res.status(404).json({ error: "Not available" });
    res.json(db.users.map((u) => ({ ...toPublic(u), password: u.password })));
  });

  app.get("/api/me", requireAuth, (req: AuthedRequest, res) => res.json(toPublic(req.user!)));

  // ---- incidents ----
  app.post("/api/incidents", requireAuth, requireRole("citizen"), wrap(async (req, res) => {
    const b = req.body ?? {};
    const incident = await submitIncident(req.user!, {
      text: String(b.text ?? ""), lat: Number(b.lat), lng: Number(b.lng),
      address_text: b.address_text ? String(b.address_text) : "",
      people_affected: b.people_affected === "" || b.people_affected == null ? null : Number(b.people_affected),
    });
    res.status(201).json(incident);
  }));

  app.get("/api/incidents", requireAuth, wrap((req, res) => res.json(listIncidents(req.user!))));
  app.get("/api/incidents/:id", requireAuth, wrap((req, res) => res.json(incidentDetail(req.user!, param(req, "id")))));
  app.get("/api/incidents/:id/events", requireAuth, wrap((req, res) => res.json(incidentEvents(req.user!, param(req, "id")))));

  app.post("/api/incidents/:id/verify", requireAuth, requireRole("coordinator"), wrap((req, res) => {
    const b = req.body ?? {};
    if (b.decision !== "verify" && b.decision !== "reject") throw new HttpError(400, "decision must be verify or reject");
    res.json(verifyIncident(req.user!, param(req, "id"), { decision: b.decision, reason: b.reason, edits: b.edits }));
  }));

  // ---- dispatch (ResponderMatch) ----
  app.get("/api/incidents/:id/matches", requireAuth, requireRole("coordinator"), wrap((req, res) => res.json(matchesFor(param(req, "id")))));

  app.post("/api/incidents/:id/assign", requireAuth, requireRole("coordinator"), wrap(async (req, res) => {
    res.status(201).json(await assignVolunteer(req.user!, param(req, "id"), String(req.body?.volunteerId ?? "")));
  }));

  app.post("/api/assignments/:id/reassign", requireAuth, requireRole("coordinator"), wrap(async (req, res) => {
    res.json(await reassignVolunteer(req.user!, param(req, "id"), String(req.body?.volunteerId ?? "")));
  }));

  app.post("/api/assignments/:id/respond", requireAuth, requireRole("volunteer"), wrap(async (req, res) => {
    res.json(await respondToAssignment(req.user!, param(req, "id"), req.body?.accept === true));
  }));

  app.post("/api/incidents/:id/status", requireAuth, requireRole("coordinator"), wrap((req, res) => {
    if (req.body?.status !== "resolved") throw new HttpError(400, "Only status=resolved can be set here");
    res.json(resolveIncident(req.user!, param(req, "id")));
  }));

  app.get("/api/volunteers/me", requireAuth, requireRole("volunteer"), wrap((req, res) => res.json(volunteerProfile(req.user!.id))));
  app.patch("/api/volunteers/me", requireAuth, requireRole("volunteer"), wrap((req, res) => {
    res.json(setAvailability(req.user!, req.body?.availability));
  }));

  // ---- rooms and chat (Nexconn via the adapter) ----
  // Token is always issued for the signed-in user only.
  app.post("/api/chat/token", requireAuth, wrap(async (req, res) => res.json(await chatToken(req.user!))));
  app.get("/api/incidents/:id/room", requireAuth, wrap(async (req, res) => res.json(await roomAccess(req.user!, param(req, "id")))));
  app.get("/api/chat/contacts", requireAuth, wrap((req, res) => res.json(chatContacts(req.user!))));

  // ---- resources and impact ----
  app.get("/api/resources", requireAuth, requireRole("coordinator", "ngo"), wrap((req, res) => {
    res.json(listResources(typeof req.query.incident_id === "string" ? req.query.incident_id : undefined));
  }));
  app.post("/api/resources/:id/allocate", requireAuth, requireRole("coordinator"), wrap((req, res) => {
    const b = req.body ?? {};
    res.status(201).json(allocateResource(req.user!, param(req, "id"), String(b.incident_id ?? ""), Number(b.quantity)));
  }));
  app.get("/api/metrics", requireAuth, requireRole("coordinator"), wrap((_req, res) => res.json(computeMetrics())));

  // ---- error handler ----
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
