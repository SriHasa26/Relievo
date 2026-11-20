// Used by citizens ("My requests") and volunteers ("My assignments"): the backend returns only what they may see.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IncidentRow } from "@/components/IncidentRow";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { IncidentListItem } from "@/lib/types";

export default function IncidentList({ title }: { title: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<IncidentListItem[] | null>(null);

  useEffect(() => {
    const load = () => api<IncidentListItem[]>("/api/incidents").then(setItems).catch(() => setItems([]));
    void load();
    const t = setInterval(load, 5000); // simple polling keeps statuses fresh
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {user?.role === "citizen" && <Link to="/citizen/new"><Button size="sm">New request</Button></Link>}
      </div>
      {items === null && <p>Loading…</p>}
      {items?.length === 0 && <p className="text-slate-600">Nothing here yet.</p>}
      {items?.map((i) => <IncidentRow key={i.id} incident={i} />)}
    </div>
  );
}
