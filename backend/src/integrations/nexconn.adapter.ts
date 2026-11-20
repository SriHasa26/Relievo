// The ONLY backend file that talks to Nexconn (server API). Nothing else may import Nexconn.
// Every function has a MOCK_MODE implementation (in-memory) and a placeholder for the real call.
// Do not guess SDK/endpoint names: paste the real call at each TODO(nexconn) marker.
import { config } from "../config";

export interface UserToken { userId: string; token: string }

// ---- in-memory mock state (MOCK_MODE only) ----
interface MockGroup { name: string; ownerId: string; members: Set<string>; systemMessages: string[] }
const mockGroups = new Map<string, MockGroup>();

export function resetMockNexconn() {
  mockGroups.clear();
}
/** Test/debug helper for the mock only. Not part of the real adapter surface. */
export function mockGroupMembers(groupId: string): string[] {
  return [...(mockGroups.get(groupId)?.members ?? [])];
}

function useMock() {
  return config.mockMode;
}

/** Issue a chat token for one app user. The frontend uses it to connect. */
export async function issueUserToken(input: { userId: string; name: string }): Promise<UserToken> {
  if (useMock()) return { userId: input.userId, token: `mock-token.${input.userId}` };
  // TODO(nexconn): paste real SDK call here (uses NEXCONN_APP_KEY + NEXCONN_APP_SECRET)
  throw new Error("Nexconn issueUserToken not implemented");
}

/** Create a group chat room. Idempotent: if the group exists, return it unchanged. */
export async function createGroup(input: {
  groupId: string; name: string; ownerId: string; memberIds: string[];
}): Promise<{ groupId: string }> {
  if (useMock()) {
    if (!mockGroups.has(input.groupId)) {
      mockGroups.set(input.groupId, {
        name: input.name, ownerId: input.ownerId,
        members: new Set([input.ownerId, ...input.memberIds]), systemMessages: [],
      });
    }
    return { groupId: input.groupId };
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn createGroup not implemented");
}

export async function addMember(input: { groupId: string; userId: string }): Promise<void> {
  if (useMock()) {
    const group = mockGroups.get(input.groupId);
    if (!group) throw new Error(`Unknown group ${input.groupId}`);
    group.members.add(input.userId);
    return;
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn addMember not implemented");
}

export async function removeMember(input: { groupId: string; userId: string }): Promise<void> {
  if (useMock()) {
    mockGroups.get(input.groupId)?.members.delete(input.userId);
    return;
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn removeMember not implemented");
}

/** Post a message from the system (e.g. the incident summary) into the group. */
export async function postSystemMessage(input: { groupId: string; text: string }): Promise<{ messageId: string }> {
  if (useMock()) {
    const group = mockGroups.get(input.groupId);
    if (!group) throw new Error(`Unknown group ${input.groupId}`);
    group.systemMessages.push(input.text);
    return { messageId: `mock-msg-${group.systemMessages.length}` };
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn postSystemMessage not implemented");
}
