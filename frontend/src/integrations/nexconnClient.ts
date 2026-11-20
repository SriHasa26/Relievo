// The ONLY frontend file that talks to Nexconn. Nothing else may import the Nexconn SDK.
// Every function has a MOCK implementation and a placeholder for the real call.
// Do not guess SDK method names: paste the real call at each TODO(nexconn) marker.
//
// MOCK: messages live in localStorage and are announced through a BroadcastChannel, so two browser
// tabs on the same origin (each signed in as a different account, see sessionStorage in lib/api.ts)
// behave like two devices chatting. This is NOT real Nexconn: it must be off (VITE_MOCK_MODE=false) for the demo.

export type ConversationType = "group" | "direct";
/** For direct conversations, `id` is the OTHER person's user id. For groups it is the group id. */
export interface Conversation { type: ConversationType; id: string }
export interface ChatMessage {
  id: string;
  conversation: Conversation;
  senderId: string;
  text: string;
  sentAt: number; // epoch ms
  isSystem?: boolean;
}
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const MOCK = import.meta.env.VITE_MOCK_MODE !== "false";

// ---------------- mock internals ----------------
interface RawMessage {
  id: string; kind: ConversationType; target: string; // group id, or the recipient's user id
  senderId: string; text: string; sentAt: number; isSystem?: boolean;
}
const STORE_KEY = "rr-mock-chat";
const mock = {
  me: null as string | null,
  joined: new Set<string>(),
  messageListeners: new Set<(m: ChatMessage) => void>(),
  statusListeners: new Set<(s: ConnectionStatus) => void>(),
  channel: null as BroadcastChannel | null,
};

const readStore = (): RawMessage[] => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as RawMessage[]; } catch { return []; }
};
const writeStore = (all: RawMessage[]) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all.slice(-500))); } catch { /* storage full or blocked */ }
};

/** Turn a stored message into what this viewer should see (direct: the "other person" is the conversation id). */
function toChatMessage(raw: RawMessage, me: string): ChatMessage {
  const conversation: Conversation = raw.kind === "group"
    ? { type: "group", id: raw.target }
    : { type: "direct", id: raw.senderId === me ? raw.target : raw.senderId };
  return { id: raw.id, conversation, senderId: raw.senderId, text: raw.text, sentAt: raw.sentAt, isSystem: raw.isSystem };
}

function deliver(raw: RawMessage) {
  const me = mock.me;
  if (!me) return;
  const relevant = raw.kind === "group" ? mock.joined.has(raw.target) : raw.target === me || raw.senderId === me;
  if (!relevant) return;
  const msg = toChatMessage(raw, me);
  mock.messageListeners.forEach((l) => l(msg));
}

function setStatus(s: ConnectionStatus) {
  mock.statusListeners.forEach((l) => l(s));
}

function mockSend(kind: ConversationType, target: string, text: string): ChatMessage {
  if (!mock.me) throw new Error("Not connected to chat");
  const raw: RawMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, target, senderId: mock.me, text, sentAt: Date.now(),
  };
  writeStore([...readStore(), raw]);
  mock.channel?.postMessage(raw); // other tabs
  deliver(raw); // this tab (a BroadcastChannel never echoes to its own instance)
  return toChatMessage(raw, mock.me);
}

// ---------------- public API ----------------

export function initNexconn(_config: { appKey: string }): void {
  if (MOCK) {
    if (!mock.channel && typeof BroadcastChannel !== "undefined") {
      mock.channel = new BroadcastChannel("reliefrelay-mock-chat");
      mock.channel.onmessage = (e: MessageEvent<RawMessage>) => deliver(e.data);
    }
    return;
  }
  // TODO(nexconn): paste real SDK call here (init with the App Key)
  throw new Error("Nexconn initNexconn not implemented");
}

export async function connectNexconn(input: { token: string }): Promise<{ userId: string }> {
  if (MOCK) {
    setStatus("connecting");
    const m = /^mock-token\.(.+)$/.exec(input.token);
    if (!m?.[1]) { setStatus("disconnected"); throw new Error("Invalid chat token"); }
    mock.me = m[1];
    setStatus("connected");
    return { userId: mock.me };
  }
  // TODO(nexconn): paste real SDK call here (connect with the token issued by our backend)
  throw new Error("Nexconn connectNexconn not implemented");
}

export async function disconnectNexconn(): Promise<void> {
  if (MOCK) {
    mock.me = null;
    mock.joined.clear();
    setStatus("disconnected");
    return;
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn disconnectNexconn not implemented");
}

export function onConnectionStatus(handler: (s: ConnectionStatus) => void): () => void {
  if (MOCK) {
    mock.statusListeners.add(handler);
    return () => { mock.statusListeners.delete(handler); };
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn onConnectionStatus not implemented");
}

/** Join a group room. The backend has already checked and recorded this user's membership. */
export async function joinRoom(input: { groupId: string }): Promise<void> {
  if (MOCK) { mock.joined.add(input.groupId); return; }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn joinRoom not implemented");
}

export async function leaveRoom(input: { groupId: string }): Promise<void> {
  if (MOCK) { mock.joined.delete(input.groupId); return; }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn leaveRoom not implemented");
}

export async function sendGroupMessage(input: { groupId: string; text: string }): Promise<ChatMessage> {
  if (MOCK) return mockSend("group", input.groupId, input.text);
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn sendGroupMessage not implemented");
}

export async function sendDirectMessage(input: { toUserId: string; text: string }): Promise<ChatMessage> {
  if (MOCK) return mockSend("direct", input.toUserId, input.text);
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn sendDirectMessage not implemented");
}

/** Subscribe to incoming messages (groups already joined, and direct messages to me). Returns unsubscribe. */
export function onMessage(handler: (m: ChatMessage) => void): () => void {
  if (MOCK) {
    mock.messageListeners.add(handler);
    return () => { mock.messageListeners.delete(handler); };
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn onMessage not implemented");
}

/** Load recent history for one conversation, oldest first. */
export async function getHistory(input: { conversation: Conversation; limit: number; before?: number }): Promise<ChatMessage[]> {
  if (MOCK) {
    const me = mock.me;
    if (!me) return [];
    const { conversation, limit, before } = input;
    return readStore()
      .filter((r) => (before === undefined || r.sentAt < before))
      .filter((r) => conversation.type === "group"
        ? r.kind === "group" && r.target === conversation.id
        : r.kind === "direct" && ((r.senderId === me && r.target === conversation.id) || (r.senderId === conversation.id && r.target === me)))
      .sort((a, b) => a.sentAt - b.sentAt)
      .slice(-limit)
      .map((r) => toChatMessage(r, me));
  }
  // TODO(nexconn): paste real SDK call here
  throw new Error("Nexconn getHistory not implemented");
}
