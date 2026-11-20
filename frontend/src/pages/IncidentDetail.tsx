import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge, SyntheticBadge, UrgencyBadge } from "@/components/badges";
import { DispatchPanel } from "@/components/DispatchPanel";
import { Timeline } from "@/components/Timeline";
import { ReportVsAi, VerifyPanel } from "@/components/VerifyPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { IncidentDetailData, IncidentEvent } from "@/lib/types";
import { label, timeAgo } from "@/lib/utils";

export default function IncidentDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<IncidentDetailData | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([
        api<IncidentDetailData>(`/api/incidents/${id}`),
        api<IncidentEvent[]>(`/api/incidents/${id}/events`),
      ]);
      setData(d);
      setEvents(e);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!data || !user) return <p>Loading…</p>;
  const { incident } = data;
  const isCoordinator = user.role === "coordinator";

  return (
    <div className="space-y-4">
      <Link to={isCoordinator ? "/coordinator" : "/"} className="text-sm text-blue-700">← Back</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold capitalize">{label(incident.category)} request</h1>
        <UrgencyBadge urgency={incident.urgency} />
        <StatusBadge status={incident.status} />
        {incident.is_synthetic && <SyntheticBadge />}
        <span className="text-sm text-slate-500">{timeAgo(incident.created_at)}</span>
      </div>

      {incident.possible_duplicate_of && isCoordinator && (
        <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          Possible duplicate: another open {incident.category} report within 2 km.{" "}
          <Link className="underline" to={`/incidents/${incident.possible_duplicate_of}`}>View it</Link>
        </p>
      )}
      {incident.status === "rejected" && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-800">Rejected: {incident.reject_reason}</p>
      )}

      {isCoordinator ? (
        <ReportVsAi data={data} />
      ) : (
        <Card>
          <CardHeader><CardTitle>Your report</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{incident.original_text}</p>
            <p className="mt-2 text-xs text-slate-500">{incident.address_text}</p>
          </CardContent>
        </Card>
      )}

      {isCoordinator && incident.status === "submitted" && <VerifyPanel data={data} onDone={load} />}

      {isCoordinator && <DispatchPanel data={data} onChange={load} />}

      {user.role === "volunteer" && data.assignments.length > 0 && (
        <p className="text-sm text-slate-600">Your assignment: {data.assignments.at(-1)!.status}</p>
      )}

      <Timeline events={events} />
    </div>
  );
}
