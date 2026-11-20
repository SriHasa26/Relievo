import { Link } from "react-router-dom";
import { StatusBadge, SyntheticBadge, UrgencyBadge } from "@/components/badges";
import type { IncidentListItem } from "@/lib/types";
import { label, timeAgo } from "@/lib/utils";

export function IncidentRow({ incident: i }: { incident: IncidentListItem }) {
  return (
    <Link to={`/incidents/${i.id}`} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium capitalize">{label(i.category)}</span>
        <UrgencyBadge urgency={i.urgency} />
        <StatusBadge status={i.status} />
        {i.possible_duplicate_of && <span className="text-xs text-amber-800">possible duplicate</span>}
        {i.is_synthetic && <SyntheticBadge />}
        <span className="ml-auto text-xs text-slate-500">{timeAgo(i.created_at)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-700">{i.original_text}</p>
      <p className="mt-1 text-xs text-slate-500">
        {i.address_text || "Location on map"}
        {i.people_affected !== null && ` · ${i.people_affected} people`}
        {i.assignee && ` · ${i.assignee.name} (${i.assignee.status})`}
      </p>
    </Link>
  );
}
