import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Radio } from "lucide-react";
import { IncidentRow } from "@/components/IncidentRow";
import { IncidentMap } from "@/components/MapView";
import { EmptyState, GlassCard, Skeleton } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { IncidentListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
type Filter = "review" | "open" | "all";

export default function CommandCentre() {
  const navigate = useNavigate();
  const [items, setItems] = useState<IncidentListItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("review");

  useEffect(() => {
    const load = () => api<IncidentListItem[]>("/api/incidents").then(setItems).catch(() => undefined);
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const list = items ?? [];
  const visible = list
    .filter((i) =>
      filter === "all" ? true
        : filter === "review" ? i.status === "submitted"
          : ["submitted", "verified", "assigned", "in_progress"].includes(i.status))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.created_at.localeCompare(b.created_at));

  const tabs: Array<[Filter, string]> = [["review", "Needs review"], ["open", "All open"], ["all", "Everything"]];
  const needsReview = list.filter((i) => i.status === "submitted").length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Radio className="size-6 text-brand" aria-hidden />Command centre</h1>
        <div className="flex flex-wrap gap-2">
          {tabs.map(([f, text]) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {text}{f === "review" && ` (${needsReview})`}
            </Button>
          ))}
        </div>
        <div className="stagger space-y-3">
          {items === null && [0, 1, 2].map((n) => <Skeleton key={n} className="h-24 rounded-2xl" />)}
          {items !== null && visible.length === 0 && <EmptyState icon={<Inbox className="size-6" />} title="Nothing in this view" hint="New citizen requests appear here, most urgent first." />}
          {visible.map((i) => <IncidentRow key={i.id} incident={i} tilt />)}
        </div>
      </section>
      <section className="lg:sticky lg:top-24 lg:self-start">
        <div className="float-map relative">
          <IncidentMap incidents={list} onSelect={(id) => navigate(`/incidents/${id}`)} height={520} />
          <GlassCard className="map-overlay">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1"><i className="led tone-red led-glow led-pulse" aria-hidden />critical</span>
              <span className="flex items-center gap-1"><i className="led tone-amber" aria-hidden />high</span>
              <span className="flex items-center gap-1"><i className="led tone-blue" aria-hidden />medium</span>
              <span className="flex items-center gap-1"><i className="led tone-gray" aria-hidden />low</span>
            </span>
          </GlassCard>
        </div>
        <p className="mt-2 text-xs text-slate-500">Colour = urgency. Click a dot to open the incident.</p>
      </section>
    </div>
  );
}
