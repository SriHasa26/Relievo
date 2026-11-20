// Private coordinator <-> volunteer messages. The contact list comes from the backend: nobody else is offered.
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { MessageSquare } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Contact { id: string; name: string; role: string }

export function DirectMessages({ preferId }: { preferId?: string }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [selected, setSelected] = useState<string | undefined>(preferId);

  useEffect(() => {
    api<Contact[]>("/api/chat/contacts").then((c) => {
      setContacts(c);
      setSelected((cur) => cur ?? (c.find((x) => x.id === preferId) ?? c[0])?.id);
    }).catch(() => setContacts([]));
  }, [preferId]);

  if (contacts === null) return <Skeleton className="h-80 rounded-2xl" />;
  if (contacts.length === 0) {
    return <EmptyState icon={<MessageSquare className="size-6" />} title="No one to message yet" hint="Contacts appear once you work with a coordinator or volunteer." />;
  }
  const current = contacts.find((c) => c.id === selected);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {contacts.map((c) => (
          <Button key={c.id} size="sm" variant={c.id === selected ? "default" : "outline"} onClick={() => setSelected(c.id)}>
            {c.name}
          </Button>
        ))}
      </div>
      {current && (
        <ChatPanel title={`Direct message: ${current.name}`} conversation={{ type: "direct", id: current.id }}
          names={{ [current.id]: current.name }} />
      )}
    </div>
  );
}
