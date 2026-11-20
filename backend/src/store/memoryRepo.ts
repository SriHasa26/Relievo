// In-memory implementation of Repo. Objects are returned by reference, so "save" has nothing to do.
import { db } from "./store";
import type { Repo } from "./repo";

const same = <T extends object>(filter: Partial<T> | undefined, row: T) =>
  Object.entries(filter ?? {}).every(([k, v]) => v === undefined || (row as Record<string, unknown>)[k] === v);

export const memoryRepo: Repo = {
  users: async () => db.users,
  userById: async (id) => db.users.find((u) => u.id === id) ?? null,
  userByEmail: async (email) => db.users.find((u) => u.email === email) ?? null,
  volunteerProfiles: async () => db.volunteerProfiles,
  saveVolunteerProfile: async () => undefined,

  incidents: async () => db.incidents,
  incident: async (id) => db.incidents.find((i) => i.id === id) ?? null,
  addIncident: async (i) => { db.incidents.push(i); },
  saveIncident: async () => undefined,
  analysis: async (incidentId) => db.analyses.find((a) => a.incident_id === incidentId) ?? null,
  analyses: async () => db.analyses,
  saveAnalysis: async (a) => {
    const i = db.analyses.findIndex((x) => x.incident_id === a.incident_id);
    if (i >= 0) db.analyses[i] = a; else db.analyses.push(a);
  },

  assignments: async (f) => db.assignments.filter((a) => same(f, a)),
  assignment: async (id) => db.assignments.find((a) => a.id === id) ?? null,
  addAssignment: async (a) => { db.assignments.push(a); },
  saveAssignment: async () => undefined,

  organisations: async () => db.organisations,
  resources: async () => db.resources,
  resource: async (id) => db.resources.find((r) => r.id === id) ?? null,
  saveResource: async () => undefined,
  allocations: async (f) => db.allocations.filter((a) => same(f, a)),
  addAllocation: async (a) => { db.allocations.push(a); },

  events: async (f) => db.events.filter((e) => same(f, e)),
  addEvent: async (e) => { db.events.push(e); },

  channels: async () => db.channels,
  channel: async (incidentId) => db.channels.find((c) => c.incident_id === incidentId) ?? null,
  addChannel: async (c) => { db.channels.push(c); },
};
