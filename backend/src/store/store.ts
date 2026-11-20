// In-memory data store used in MOCK_MODE. Plain arrays, no magic.
// The Supabase schema in /supabase/migrations mirrors these tables.
// TODO(supabase): implement the same access on top of supabase-js for real mode.
import { randomUUID } from "node:crypto";
import { buildSeed, type SeedData } from "./seedData";
import type { IncidentEvent } from "../types";

export let db: SeedData = buildSeed();

export function resetDb(seed: SeedData = buildSeed()) {
  db = seed;
}

export const newId = () => randomUUID();

/** Append-only audit trail. Every state change in the app calls this. */
export function logEvent(incidentId: string, actorId: string | null, action: string, meta: Record<string, unknown> = {}) {
  const event: IncidentEvent = {
    id: newId(), incident_id: incidentId, actor_id: actorId, action, meta, created_at: new Date().toISOString(),
  };
  db.events.push(event);
  return event;
}
