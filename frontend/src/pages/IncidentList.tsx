// Used by citizens ("My requests") and volunteers ("My assignments"): the backend returns only what they may see.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { IncidentRow } from "@/components/IncidentRow";
import { EmptyState, SkeletonList } from "@/components/kit";
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
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {user?.role === "citizen" && <Link to="/citizen/new" className="ml-auto"><Button size="lg"><Plus className="size-4" aria-hidden />New request</Button></Link>}
      </div>
      {items === null && <SkeletonList rows={3} />}
      {items?.length === 0 && (
        <EmptyState icon={<FileText className="size-6" />} title="Nothing here yet"
          hint={user?.role === "citizen" ? "Send a request and you can follow its progress here." : undefined} />
      )}
      <div className="stagger space-y-3">{items?.map((i) => <IncidentRow key={i.id} incident={i} />)}</div>
    </div>
  );
}
