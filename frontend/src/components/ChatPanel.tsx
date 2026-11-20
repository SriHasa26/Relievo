// One chat window: a group room or a direct conversation. All messaging goes through nexconnClient.
import { useEffect, useRef, useState } from "react";
import {
  getHistory, joinRoom, leaveRoom, onMessage, sendDirectMessage, sendGroupMessage,
  type ChatMessage, type Conversation,
} from "@/integrations/nexconnClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureConnected } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function ChatPanel({
  title, conversation, names,
}: { title: string; conversation: Conversation; names: Record<string, string> }) {
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setMessages([]);
    (async () => {
      try {
        const userId = await ensureConnected();
        if (conversation.type === "group") await joinRoom({ groupId: conversation.id });
        const history = await getHistory({ conversation, limit: 50 });
        if (cancelled) return;
        setMe(userId);
        setMessages(history);
        unsubscribe = onMessage((m) => {
          if (m.conversation.type !== conversation.type || m.conversation.id !== conversation.id) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
      if (conversation.type === "group") void leaveRoom({ groupId: conversation.id }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.type, conversation.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      const sent = conversation.type === "group"
        ? await sendGroupMessage({ groupId: conversation.id, text: body })
        : await sendDirectMessage({ toUserId: conversation.id, text: body });
      setMessages((prev) => (prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
          {import.meta.env.VITE_MOCK_MODE !== "false" && (
            <span className="ml-2 text-xs font-normal text-amber-700">mock chat (not Nexconn)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-64 space-y-2 overflow-y-auto rounded bg-slate-50 p-2" aria-live="polite">
          {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
          {messages.map((m) => {
            const mine = m.senderId === me;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-lg px-3 py-1.5 text-sm", mine ? "bg-blue-700 text-white" : "bg-white shadow-sm")}>
                  {!mine && <div className="text-xs font-semibold text-slate-500">{names[m.senderId] ?? "Someone"}</div>}
                  {m.text}
                  <div className={cn("text-[10px]", mine ? "text-blue-100" : "text-slate-400")}>
                    {new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <form onSubmit={send} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
          <Button type="submit">Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
