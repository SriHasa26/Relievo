import { db, logEvent, newId } from "../store/store";
import { extractIncident, CATEGORIES, URGENCIES } from "./extraction";
import { distanceKm } from "./matching";
import type { AiAnalysis, Assignment, Category, Incident, Urgency, User } from "../types";

/** An error that carries an HTTP status, so routes can reply with the right code. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ACTIVE_ASSIGNMENT = ["approved", "accepted"] as const;
export const activeAssignment = (incidentId: string): Assignment | undefined =>
  db.assignments.find((a) => a.incident_id === incidentId && (ACTIVE_ASSIGNMENT as readonly string[]).includes(a.status));

export function getIncident(id: string): Incident {
  const incident = db.incidents.find((i) => i.id === id);
  if (!incident) throw new HttpError(404, "Incident not found");
  return incident;
}

/** Who may see an incident: reporter, any coordinator, or a volunteer who was assigned to it. */
export function canSee(user: User, incident: Incident): boolean {
  if (user.role === "coordinator") return true;
  if (user.role === "citizen") return incident.reporter_id === user.id;
  if (user.role === "volunteer") {
    return db.assignments.some(
      (a) => a.incident_id === incident.id && a.volunteer_id === user.id && a.status !== "declined",
    );
  }
  return false;
}

export function assertCanSee(user: User, incident: Incident) {
  if (!canSee(user, incident)) throw new HttpError(403, "You do not have access to this incident");
}

// ---------- submit ----------

export interface SubmitInput {
  text: string;
  lat: number;
  lng: number;
  address_text?: string;
  people_affected?: number | null;
}

export async function submitIncident(user: User, input: SubmitInput): Promise<Incident> {
  const text = input.text?.trim();
  if (!text) throw new HttpError(400, "Please describe the emergency");
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) throw new HttpError(400, "Location is required");

  const ai = await extractIncident(text);
  const x = ai.extracted_data;
  const formPeople = input.people_affected ?? null;

  const incident: Incident = {
    id: newId(), reporter_id: user.id, original_text: text, title: x.summary,
    category: x.category, urgency: x.urgency,
    people_affected: formPeople !== null && formPeople >= 0 ? Math.floor(formPeople) : x.people_affected,
    needs: x.needs, vulnerable_persons: x.vulnerable_persons,
    lat: input.lat, lng: input.lng, address_text: input.address_text?.trim() ?? "",
    status: "submitted", reject_reason: null,
    possible_duplicate_of: findPossibleDuplicate(x.category, input.lat, input.lng),
    is_synthetic: user.is_synthetic, created_at: new Date().toISOString(),
  };
  db.incidents.push(incident);
  db.analyses.push({ incident_id: incident.id, ...ai });

  logEvent(incident.id, user.id, "submitted");
  logEvent(incident.id, null, "ai_analyzed", { source: ai.source });
  if (incident.possible_duplicate_of) {
    logEvent(incident.id, null, "duplicate_flagged", { of: incident.possible_duplicate_of });
  }
  return incident;
}

/** Simple duplicate hint: same category, within 2 km, still open, in the last 24 h. */
function findPossibleDuplicate(category: Category, lat: number, lng: number): string | null {
  const dayAgo = Date.now() - 24 * 3_600_000;
  const open = ["submitted", "verified", "assigned", "in_progress"];
  const match = db.incidents.find(
    (i) => i.category === category && open.includes(i.status) && new Date(i.created_at).getTime() > dayAgo
      && distanceKm({ lat, lng }, i) <= 2,
  );
  return match?.id ?? null;
}

// ---------- verify / reject / edit ----------

export interface VerifyInput {
  decision: "verify" | "reject";
  reason?: string;
  edits?: { category?: Category; urgency?: Urgency; people_affected?: number | null; needs?: string[] };
}

export function verifyIncident(coordinator: User, incidentId: string, input: VerifyInput): Incident {
  const incident = getIncident(incidentId);
  if (incident.status !== "submitted") throw new HttpError(409, `Incident is already ${incident.status}`);

  if (input.decision === "reject") {
    if (!input.reason?.trim()) throw new HttpError(400, "A reason is required to reject");
    incident.status = "rejected";
    incident.reject_reason = input.reason.trim();
    logEvent(incident.id, coordinator.id, "rejected", { reason: incident.reject_reason });
    return incident;
  }

  const e = input.edits ?? {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const apply = <K extends "category" | "urgency" | "people_affected" | "needs">(key: K, value: Incident[K] | undefined) => {
    if (value === undefined) return;
    if (JSON.stringify(incident[key]) === JSON.stringify(value)) return;
    changes[key] = { from: incident[key], to: value };
    incident[key] = value;
  };
  if (e.category !== undefined && !CATEGORIES.includes(e.category)) throw new HttpError(400, "Invalid category");
  if (e.urgency !== undefined && !URGENCIES.includes(e.urgency)) throw new HttpError(400, "Invalid urgency");
  if (e.people_affected != null && (!Number.isInteger(e.people_affected) || e.people_affected < 0)) {
    throw new HttpError(400, "People affected must be a whole number");
  }
  apply("category", e.category);
  apply("urgency", e.urgency);
  apply("people_affected", e.people_affected);
  apply("needs", e.needs);

  if (Object.keys(changes).length > 0) logEvent(incident.id, coordinator.id, "edited", { changes });
  incident.status = "verified";
  logEvent(incident.id, coordinator.id, "verified");
  return incident;
}

// ---------- read models ----------

const nameOf = (id: string | null) => (id ? db.users.find((u) => u.id === id)?.name ?? "Unknown" : "System");

export function listIncidents(user: User) {
  return db.incidents
    .filter((i) => canSee(user, i))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((i) => {
      const active = activeAssignment(i.id);
      return {
        ...i,
        assignee: user.role === "citizen" || !active
          ? null : { id: active.volunteer_id, name: nameOf(active.volunteer_id), status: active.status },
      };
    });
}

export function incidentDetail(user: User, incidentId: string) {
  const incident = getIncident(incidentId);
  assertCanSee(user, incident);
  const isCoordinator = user.role === "coordinator";
  const analysis: AiAnalysis | null = isCoordinator
    ? db.analyses.find((a) => a.incident_id === incident.id) ?? null : null;
  const assignments = db.assignments
    .filter((a) => a.incident_id === incident.id)
    .filter((a) => isCoordinator || a.volunteer_id === user.id) // citizens see none; volunteers only their own
    .map((a) => ({ ...a, volunteer_name: nameOf(a.volunteer_id), assigned_by_name: nameOf(a.assigned_by) }));
  const allocations = isCoordinator
    ? db.allocations.filter((a) => a.incident_id === incident.id).map((a) => ({
      ...a, resource_name: db.resources.find((r) => r.id === a.resource_id)?.name ?? "?",
    })) : [];
  return {
    incident,
    reporter: isCoordinator ? { id: incident.reporter_id, name: nameOf(incident.reporter_id) } : null,
    analysis, assignments, allocations,
    has_room: db.channels.some((c) => c.incident_id === incident.id),
  };
}

export function incidentEvents(user: User, incidentId: string) {
  const incident = getIncident(incidentId);
  assertCanSee(user, incident);
  return db.events
    .filter((e) => e.incident_id === incident.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({ ...e, actor_name: nameOf(e.actor_id) }));
}
