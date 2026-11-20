import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { HOME, type Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV: Record<Role, Array<[string, string]>> = {
  citizen: [["/citizen", "My requests"], ["/citizen/new", "New request"]],
  volunteer: [["/volunteer", "My assignments"]],
  coordinator: [["/coordinator", "Command centre"], ["/impact", "Impact"], ["/resources", "Resources"]],
  ngo: [["/resources", "Resources"]],
};

/** Large-text accessibility toggle: persisted, applied as a class on <html>. */
function useLargeText() {
  const [on, setOn] = useState(() => localStorage.getItem("rr-large-text") === "1");
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", on);
    localStorage.setItem("rr-large-text", on ? "1" : "0");
  }, [on]);
  return [on, setOn] as const;
}

export function Layout() {
  const { user, loading, signOut } = useAuth();
  const [large, setLarge] = useLargeText();
  if (loading) return <p className="p-6">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen">
      <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900">
        SYNTHETIC DEMO DATA. Not real emergencies.
        {import.meta.env.VITE_MOCK_MODE !== "false" && " MOCK MODE: chat and AI are simulated."}
      </div>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to={HOME[user.role]} className="text-lg font-bold text-blue-800">ReliefRelay</Link>
          <nav className="flex gap-1">
            {NAV[user.role].map(([to, text]) => (
              <NavLink key={to} to={to} end
                className={({ isActive }) => cn("rounded px-3 py-1.5 text-sm", isActive ? "bg-blue-100 font-semibold" : "hover:bg-slate-100")}>
                {text}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button variant={large ? "default" : "outline"} size="sm" aria-pressed={large} onClick={() => setLarge(!large)}>
              Large text
            </Button>
            <span className="text-sm">{user.name} <Badge tone="blue">{user.role}</Badge></span>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <>{children}</>;
}
