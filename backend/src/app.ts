import cors from "cors";
import express from "express";
import { config } from "./config";
import { login, requireAuth, toPublic, type AuthedRequest } from "./auth";
import { db } from "./store/store";

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

  return app;
}
