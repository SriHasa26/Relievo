import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IncidentRow } from "@/components/IncidentRow";
import { IncidentMap } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { IncidentListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
type Filter = "review" | "open" | "all";

export default function CommandCentre() {
  const navigate = useNavigate();
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("review");

  useEffect(() => {
    const load = () => api<IncidentListItem[]>("/api/incidents").then(setItems).catch(() => undefined);
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const visible = items
    .filter((i) =>
      filter === "all" ? true
        : filter === "review" ? i.status === "submitted"
          : ["submitted", "verified", "assigned", "in_progress"].includes(i.status))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.created_at.localeCompare(b.created_at));

  const tabs: Array<[Filter, string]> = [["review", "Needs review"], ["open", "All open"], ["all", "Everything"]];
  const needsReview = items.filter((i) => i.status === "submitted").length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Command centre</h1>
        <div className="flex gap-2">
          {tabs.map(([f, text]) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {text}{f === "review" && ` (${needsReview})`}
            </Button>
          ))}
        </div>
        <div className={cn("space-y-2")}>
          {visible.length === 0 && <p className="text-slate-600">Nothing in this view.</p>}
          {visible.map((i) => <IncidentRow key={i.id} incident={i} />)}
        </div>
      </section>
      <section>
        <IncidentMap incidents={items} onSelect={(id) => navigate(`/incidents/${id}`)} height={520} />
        <p className="mt-1 text-xs text-slate-500">Colour = urgency. Click a dot to open the incident.</p>
      </section>
    </div>
  );
}
