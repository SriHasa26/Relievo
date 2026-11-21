import { Link } from "react-router-dom";
import { StatusBadge, SyntheticBadge, UrgencyBadge } from "@/components/badges";
import { TiltCard, UrgencyGauge } from "@/components/kit";
import type { IncidentListItem } from "@/lib/types";
import { label, timeAgo } from "@/lib/utils";

/** One incident in a list. `tilt` adds the 3D hover tilt (coordinator view only; off for touch and reduced motion). */
export function IncidentRow({ incident: i, tilt }: { incident: IncidentListItem; tilt?: boolean }) {
  const row = (
    <Link to={`/incidents/${i.id}`}
      className="rr-card block p-3.5 transition-colors hover:border-[var(--brand)] focus-visible:border-[var(--brand)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold capitalize">{label(i.category)}</span>
        <UrgencyBadge urgency={i.urgency} />
        <StatusBadge status={i.status} />
        {i.possible_duplicate_of && <span className="text-xs text-amber-800">possible duplicate</span>}
        {i.is_synthetic && <SyntheticBadge />}
        <span className="ml-auto text-xs text-slate-500">{timeAgo(i.created_at)}</span>
      </div>
      <div className="mt-1.5 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm text-slate-700">{i.original_text}</p>
          <p className="mt-1 text-xs text-slate-500">
            {i.address_text || "Location on map"}
            {i.people_affected !== null && ` · ${i.people_affected} people`}
            {i.assignee && ` · ${i.assignee.name} (${i.assignee.status})`}
          </p>
        </div>
        {tilt && <div className="hidden sm:block"><UrgencyGauge urgency={i.urgency} size={52} /></div>}
      </div>
    </Link>
  );
  return tilt ? <TiltCard>{row}</TiltCard> : row;
}
