import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { IncidentStatus, Urgency } from "@/lib/types";
import { label } from "@/lib/utils";

interface Metrics {
  total_incidents: number;
  status_counts: Record<IncidentStatus, number>;
  awaiting_review: number;
  unassigned_incidents: Array<{ id: string; category: string; urgency: Urgency; waiting_minutes: number }>;
  avg_minutes_to_verify: number | null;
  avg_minutes_to_assign: number | null;
  resolution_rate: number;
  volunteers_deployed: number;
  resources_allocated_units: number;
  resources_allocations: number;
  events_recorded: number;
  synthetic: boolean;
}

const fmt = (n: number | null) => (n === null ? "n/a" : `${n} min`);

function Tile({ title, value, note }: { title: string; value: string | number; note?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default function Impact() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    const load = () => api<Metrics>("/api/metrics").then(setM).catch(() => undefined);
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!m) return <p>Loading…</p>;
  const statuses = Object.entries(m.status_counts) as Array<[IncidentStatus, number]>;
  const max = Math.max(1, ...statuses.map(([, n]) => n));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Impact dashboard</h1>
      {m.synthetic && (
        <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          All figures are computed from <b>synthetic demo data</b> and the incident event log. They are not real-world results.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile title="Incidents" value={m.total_incidents} />
        <Tile title="Awaiting review" value={m.awaiting_review} note="submitted, not yet verified" />
        <Tile title="Avg time to verify" value={fmt(m.avg_minutes_to_verify)} note="submitted → verified" />
        <Tile title="Avg time to assign" value={fmt(m.avg_minutes_to_assign)} note="verified → volunteer approved" />
        <Tile title="Resolution rate" value={`${m.resolution_rate}%`} note="resolved / not rejected" />
        <Tile title="Volunteers deployed" value={m.volunteers_deployed} />
        <Tile title="Resources allocated" value={m.resources_allocated_units} note={`${m.resources_allocations} allocations`} />
        <Tile title="Events recorded" value={m.events_recorded} note="audit trail entries" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incidents by status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {statuses.map(([status, n]) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span className="w-24 capitalize">{label(status)}</span>
                <div className="h-4 flex-1 rounded bg-slate-100">
                  <div className="h-4 rounded bg-blue-600" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-medium">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Verified but unassigned</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {m.unassigned_incidents.length === 0 && <p className="text-sm text-slate-600">None. Every verified incident has a volunteer.</p>}
            {m.unassigned_incidents.map((u) => (
              <Link key={u.id} to={`/incidents/${u.id}`} className="flex items-center gap-2 rounded border p-2 text-sm hover:border-blue-400">
                <span className="capitalize">{u.category}</span>
                <Badge tone={u.urgency === "critical" ? "red" : "amber"}>{u.urgency}</Badge>
                <span className="ml-auto text-slate-500">waiting {u.waiting_minutes} min</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
