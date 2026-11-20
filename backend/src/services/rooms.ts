// Incident chat rooms. Supabase (db.assignments / db.channels) is the source of truth for WHO may be in a room;
// Nexconn only carries the messages. Every change here goes through the adapter, never Nexconn directly.
import { randomUUID } from "node:crypto";
import * as nexconn from "../integrations/nexconn.adapter";
import { getRepo, logEvent } from "../store/repo";
import { HttpError, activeAssignment, getIncident } from "./incidents";
import type { Incident, User } from "../types";

const channelFor = async (incidentId: string) => (await getRepo()).channel(incidentId);

/** Create the incident's group (once), add the coordinator and the volunteer, post the incident summary. */
export async function ensureRoomFor(incident: Incident, coordinatorId: string, volunteerId: string): Promise<string> {
  const repo = await getRepo();
  let channel = await channelFor(incident.id);
  if (!channel) {
    const groupId = randomUUID(); // opaque id, not derived from the incident id
    await nexconn.createGroup({
      groupId, name: `Incident: ${incident.category} · ${incident.address_text || incident.id.slice(0, 8)}`,
      ownerId: coordinatorId, memberIds: [volunteerId],
    });
    channel = { incident_id: incident.id, nexconn_channel_id: groupId };
    await repo.addChannel(channel);
    await logEvent(incident.id, null, "room_created");
    await nexconn.postSystemMessage({
      groupId,
      text: `Incident room opened. ${incident.category} request, urgency ${incident.urgency}, `
        + `${incident.people_affected ?? "unknown"} people. ${incident.original_text}`,
    });
  } else {
    await nexconn.addMember({ groupId: channel.nexconn_channel_id, userId: coordinatorId });
    await nexconn.addMember({ groupId: channel.nexconn_channel_id, userId: volunteerId });
  }
  return channel.nexconn_channel_id;
}

/** Remove a volunteer who declined or was replaced. */
export async function removeVolunteerFromRoom(incidentId: string, volunteerId: string): Promise<void> {
  const channel = await channelFor(incidentId);
  if (channel) await nexconn.removeMember({ groupId: channel.nexconn_channel_id, userId: volunteerId });
}

/**
 * Who may open the room: any coordinator, or the volunteer with an active assignment (approved or accepted).
 * Returns the group id after making sure the caller is a member of it.
 */
export async function roomAccess(
  user: User, incidentId: string,
): Promise<{ groupId: string; participants: Array<{ id: string; name: string; role: string }> }> {
  const incident = await getIncident(incidentId);
  const channel = await channelFor(incident.id);
  if (!channel) throw new HttpError(404, "No chat room for this incident yet. It opens when a volunteer is assigned.");

  const active = await activeAssignment(incident.id);
  const allowed = user.role === "coordinator" || (user.role === "volunteer" && active?.volunteer_id === user.id);
  if (!allowed) throw new HttpError(403, "You are not a member of this incident room");

  await nexconn.addMember({ groupId: channel.nexconn_channel_id, userId: user.id }); // idempotent
  // Names so the chat UI can label messages: all coordinators plus the active volunteer.
  const people = (await (await getRepo()).users()).filter((u) => u.role === "coordinator" || u.id === active?.volunteer_id);
  return {
    groupId: channel.nexconn_channel_id,
    participants: people.map((u) => ({ id: u.id, name: u.name, role: u.role })),
  };
}

/** Direct messages are only offered between coordinators and volunteers who work together. */
export async function chatContacts(user: User) {
  const repo = await getRepo();
  const users = await repo.users();
  const pub = (id: string) => {
    const u = users.find((x) => x.id === id)!;
    return { id: u.id, name: u.name, role: u.role };
  };
  if (user.role === "coordinator") {
    return users.filter((u) => u.role === "volunteer" && u.verified).map((u) => pub(u.id));
  }
  if (user.role === "volunteer") {
    const mine = await repo.assignments({ volunteer_id: user.id });
    const coordinatorIds = new Set(mine.filter((a) => a.status !== "declined").map((a) => a.assigned_by));
    return [...coordinatorIds].map(pub);
  }
  return [];
}

/** Issue a chat token for the caller only. userId comes from the verified session, never from the request body. */
export async function chatToken(user: User) {
  return nexconn.issueUserToken({ userId: user.id, name: user.name });
}

/**
 * Make sure the Nexconn group exists for every stored room, from the stored room id and the stored assignment.
 * Used for the seeded in-memory data (MOCK_DB=true) and by the Supabase seed script. Idempotent.
 * With MOCK_DB=false the rooms were created once by the seed script (or at assignment time) and are simply reused.
 */
export async function restoreRooms() {
  const repo = await getRepo();
  const [channels, incidents, assignments] = await Promise.all([repo.channels(), repo.incidents(), repo.assignments()]);
  for (const channel of channels) {
    const incident = incidents.find((i) => i.id === channel.incident_id);
    const active = assignments.find((a) => a.incident_id === channel.incident_id && ["approved", "accepted", "completed"].includes(a.status));
    if (!incident || !active) continue;
    await nexconn.createGroup({
      groupId: channel.nexconn_channel_id, name: `Incident: ${incident.category}`,
      ownerId: active.assigned_by, memberIds: [active.volunteer_id],
    });
  }
}

/** At start-up: register every app user with Nexconn, so a direct message to someone who never logged in still works. */
export async function registerAllUsers() {
  const users = await (await getRepo()).users();
  await nexconn.registerUsers(users.map((u) => ({ userId: u.id, name: u.name })));
}
