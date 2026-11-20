import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge, UrgencyBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { IncidentListItem } from "@/lib/types";
import { label } from "@/lib/utils";

type Availability = "available" | "busy" | "offline";

export default function VolunteerDashboard() {
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [availability, setAvailability] = useState<Availability>("available");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<IncidentListItem[]>("/api/incidents").then(setItems).catch(() => undefined);
    api<{ availability: Availability }>("/api/volunteers/me").then((p) => setAvailability(p.availability)).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const respond = async (assignmentId: string, accept: boolean) => {
    setError("");
    try { await api(`/api/assignments/${assignmentId}/respond`, { body: { accept } }); load(); }
    catch (e) { setError((e as Error).message); }
  };
  const changeAvailability = async (value: Availability) => {
    setAvailability(value);
    await api("/api/volunteers/me", { method: "PATCH", body: { availability: value } });
  };

  const pending = items.filter((i) => i.assignee?.status === "approved");
  const rest = items.filter((i) => i.assignee?.status !== "approved");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My assignments</h1>
      <label className="flex items-center gap-2 text-sm">
        My availability
        <select value={availability} onChange={(e) => void changeAvailability(e.target.value as Availability)}
          className="rounded border border-slate-300 p-1.5">
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
        <span className="text-xs text-slate-500">Busy or offline volunteers are not offered new assignments.</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {pending.length > 0 && <h2 className="font-semibold">Waiting for your answer</h2>}
      {pending.map((i) => (
        <Card key={i.id} className="border-amber-300">
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium capitalize">{label(i.category)}</span>
              <UrgencyBadge urgency={i.urgency} />
              <span className="text-sm text-slate-500">{i.address_text}{i.people_affected !== null && ` · ${i.people_affected} people`}</span>
            </div>
            <p className="text-sm">{i.original_text}</p>
            <div className="flex gap-2">
              <Button onClick={() => respond(i.assignee!.assignment_id, true)}>Accept</Button>
              <Button variant="outline" onClick={() => respond(i.assignee!.assignment_id, false)}>Decline</Button>
              <Link to={`/incidents/${i.id}`}><Button variant="ghost">Details</Button></Link>
            </div>
          </CardContent>
        </Card>
      ))}

      {rest.length > 0 && <h2 className="font-semibold">Current and past</h2>}
      {rest.map((i) => (
        <Link key={i.id} to={`/incidents/${i.id}`} className="block rounded-lg border bg-white p-3 hover:border-blue-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium capitalize">{label(i.category)}</span>
            <UrgencyBadge urgency={i.urgency} />
            <StatusBadge status={i.status} />
            {i.assignee && <Badge>{i.assignee.status}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-700">{i.original_text}</p>
        </Link>
      ))}
      {items.length === 0 && <p className="text-slate-600">No assignments yet.</p>}
    </div>
  );
}
