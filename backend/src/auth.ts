// Mock authentication (MOCK_MODE): seeded accounts log in with email + password and get an opaque token.
// TODO(supabase): in real mode, verify the Supabase JWT here instead. Routes only use req.user.
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./store/store";
import type { Role, User } from "./types";

const sessions = new Map<string, string>(); // token -> user id

export function login(email: string, password: string): { token: string; user: PublicUser } | null {
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  const token = randomUUID();
  sessions.set(token, user.id);
  return { token, user: toPublic(user) };
}

export type PublicUser = Omit<User, "password">;
export const toPublic = ({ password: _p, ...rest }: User): PublicUser => rest;

export interface AuthedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const userId = token ? sessions.get(token) : undefined;
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  if (!user) return void res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
}

export const requireRole = (...roles: Role[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return void res.status(403).json({ error: "Not allowed for your role" });
  next();
};
