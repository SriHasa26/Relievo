// Dispatch workflow: ranked matches -> coordinator approves -> volunteer accepts/declines -> resolve.
// The AI never assigns anyone. Only a coordinator's approve/reassign call creates an assignment.
import { db, logEvent, newId } from "../store/store";
import { HttpError, activeAssignment, getIncident } from "./incidents";
import { rankVolunteers, type Candidate, type MatchResult } from "./matching";
import type { Assignment, Availability, Incident, User } from "../types";

const activeCountFor = (volunteerId: string) =>
  db.assignments.filter((a) => a.volunteer_id === volunteerId && (a.status === "approved" || a.status === "accepted")).length;

function allCandidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const profile of db.volunteerProfiles) {
    const user = db.users.find((u) => u.id === profile.user_id && u.role === "volunteer");
    if (user) out.push({ user, profile, activeCount: activeCountFor(user.id) });
  }
  return out;
}

const declinedFor = (incidentId: string) =>
  db.assignments.filter((a) => a.incident_id === incidentId && a.status === "declined").map((a) => a.volunteer_id);

/** Ranked volunteers for an incident (the person currently assigned is left out, so this also serves reassignment). */
export function matchesFor(incidentId: string): MatchResult[] {
  const incident = getIncident(incidentId);
  if (!["verified", "assigned", "in_progress"].includes(incident.status)) {
    throw new HttpError(409, "Matching is available only for verified incidents");
  }
  const current = activeAssignment(incident.id)?.volunteer_id;
  const candidates = allCandidates().filter((c) => c.user.id !== current);
  return rankVolunteers(incident, candidates, declinedFor(incident.id));
}

/** Server-side re-check of the hard rules, so a stale or tampered UI cannot assign an ineligible volunteer. */
function pickEligible(incident: Incident, volunteerId: string): MatchResult {
  const match = matchesFor(incident.id).find((m) => m.volunteer_id === volunteerId);
  if (!match) throw new HttpError(404, "Volunteer not found");
  if (!match.eligible) throw new HttpError(409, `Cannot assign ${match.name}: ${match.excluded_reason}`);
  return match;
}

function createAssignment(coordinator: User, incident: Incident, match: MatchResult): Assignment {
  const assignment: Assignment = {
    id: newId(), incident_id: incident.id, volunteer_id: match.volunteer_id, assigned_by: coordinator.id,
    status: "approved", score_breakdown: match.breakdown, created_at: new Date().toISOString(), responded_at: null,
  };
  db.assignments.push(assignment);
  incident.status = "assigned";
  return assignment;
}

/** Coordinator approves a volunteer for a verified incident. */
export function assignVolunteer(coordinator: User, incidentId: string, volunteerId: string): Assignment {
  const incident = getIncident(incidentId);
  if (incident.status !== "verified") throw new HttpError(409, `Incident is ${incident.status}; it must be verified (and unassigned) to assign`);
  const match = pickEligible(incident, volunteerId);
  const assignment = createAssignment(coordinator, incident, match);
  logEvent(incident.id, coordinator.id, "assigned", { volunteer_id: volunteerId, score: match.breakdown?.total });
  return assignment;
}

/** Coordinator replaces the current volunteer with another eligible one. */
export function reassignVolunteer(coordinator: User, assignmentId: string, newVolunteerId: string): Assignment {
  const old = db.assignments.find((a) => a.id === assignmentId);
  if (!old || (old.status !== "approved" && old.status !== "accepted")) throw new HttpError(404, "No active assignment to reassign");
  if (old.volunteer_id === newVolunteerId) throw new HttpError(400, "Choose a different volunteer");
  const incident = getIncident(old.incident_id);
  const match = pickEligible(incident, newVolunteerId);
  old.status = "reassigned";
  old.responded_at = new Date().toISOString();
  const assignment = createAssignment(coordinator, incident, match);
  logEvent(incident.id, coordinator.id, "reassigned", {
    from_volunteer_id: old.volunteer_id, volunteer_id: newVolunteerId, score: match.breakdown?.total,
  });
  return assignment;
}

/** Volunteer answers an approved assignment. A decline puts the incident back in the matching list. */
export function respondToAssignment(volunteer: User, assignmentId: string, accept: boolean): Assignment {
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  if (!assignment || assignment.volunteer_id !== volunteer.id) throw new HttpError(404, "Assignment not found");
  if (assignment.status !== "approved") throw new HttpError(409, `Assignment is already ${assignment.status}`);
  const incident = getIncident(assignment.incident_id);
  assignment.responded_at = new Date().toISOString();

  if (accept) {
    assignment.status = "accepted";
    incident.status = "in_progress";
    logEvent(incident.id, volunteer.id, "accepted");
  } else {
    assignment.status = "declined";
    incident.status = "verified"; // back to the coordinator's matching list
    logEvent(incident.id, volunteer.id, "declined");
  }
  return assignment;
}

/** Coordinator confirms resolution. Frees the volunteer (their active count drops). */
export function resolveIncident(coordinator: User, incidentId: string): Incident {
  const incident = getIncident(incidentId);
  if (incident.status !== "in_progress") throw new HttpError(409, "Only an in-progress incident can be resolved");
  const active = activeAssignment(incident.id);
  if (active) {
    active.status = "completed";
    active.responded_at = active.responded_at ?? new Date().toISOString();
  }
  incident.status = "resolved";
  logEvent(incident.id, coordinator.id, "resolved");
  return incident;
}

export function setAvailability(volunteer: User, availability: Availability) {
  const profile = db.volunteerProfiles.find((p) => p.user_id === volunteer.id);
  if (!profile) throw new HttpError(404, "Volunteer profile not found");
  if (!["available", "busy", "offline"].includes(availability)) throw new HttpError(400, "Invalid availability");
  profile.availability = availability;
  return profile;
}

export const volunteerProfile = (volunteerId: string) => db.volunteerProfiles.find((p) => p.user_id === volunteerId) ?? null;
