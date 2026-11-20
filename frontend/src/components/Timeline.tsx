import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncidentEvent } from "@/lib/types";

const TEXT: Record<string, string> = {
  submitted: "Request submitted",
  ai_analyzed: "AI analysis completed (suggestion only)",
  duplicate_flagged: "Flagged as a possible duplicate",
  edited: "Coordinator edited the AI fields",
  verified: "Verified by coordinator",
  rejected: "Rejected by coordinator",
  assigned: "Volunteer assigned (approved by coordinator)",
  reassigned: "Reassigned to another volunteer",
  declined: "Volunteer declined",
  accepted: "Volunteer accepted. Work in progress",
  room_created: "Incident chat room created",
  resource_allocated: "Relief resource allocated",
  resolved: "Marked resolved",
};

export function Timeline({ events }: { events: IncidentEvent[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Status timeline</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-blue-600" />
              <p className="text-sm font-medium">{TEXT[e.action] ?? e.action}</p>
              <p className="text-xs text-slate-500">
                {e.actor_name} · {new Date(e.created_at).toLocaleString()}
                {typeof e.meta.reason === "string" && ` · "${e.meta.reason}"`}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
