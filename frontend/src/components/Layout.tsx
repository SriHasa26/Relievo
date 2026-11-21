import type { ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Boxes, HeartHandshake, LayoutDashboard, ListChecks, LogOut, MessageSquare, PlusCircle, ShieldAlert, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { HOME, type Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NeuToggle, SkeletonList, ThemeToggle } from "@/components/kit";
import { isMockChat } from "@/integrations/nexconnClient";
import { useLargeText } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const NAV: Record<Role, Array<[string, string, LucideIcon]>> = {
  citizen: [["/citizen", "My requests", ListChecks], ["/citizen/new", "New request", PlusCircle]],
  volunteer: [["/volunteer", "My assignments", HeartHandshake], ["/messages", "Messages", MessageSquare]],
  coordinator: [["/coordinator", "Command centre", LayoutDashboard], ["/messages", "Messages", MessageSquare], ["/impact", "Impact", BarChart3], ["/resources", "Resources", Boxes]],
  ngo: [["/resources", "Resources", Boxes]],
};

export function Layout() {
  const { user, loading, signOut } = useAuth();
  const [large, setLarge] = useLargeText();
  const { pathname } = useLocation();
  if (loading) return <div className="app-root p-6"><SkeletonList rows={3} /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-root mesh" data-role={user.role}>
      <header className="glass sticky top-0 z-[1100] rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to={HOME[user.role]} className="flex items-center gap-2 font-display text-lg font-bold" style={{ color: "var(--text)" }}>
            <ShieldAlert className="size-6 text-brand" aria-hidden /> ReliefRelay
          </Link>
          <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV[user.role].map(([to, text, Icon]) => (
              <NavLink key={to} to={to} end
                className={({ isActive }) => cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  isActive ? "bg-[var(--pill-ember-bg)] font-semibold text-[var(--pill-ember-fg)]" : "hover:bg-[var(--surface-2)]")}>
                <Icon className="size-4" aria-hidden />{text}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {isMockChat && <span className="pill tone-amber whitespace-nowrap" title="Chat is simulated, not Nexconn">MOCK CHAT</span>}
            <ThemeToggle />
            <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
              Large text
              <NeuToggle checked={large} onChange={setLarge} label="Large text" />
            </label>
            <span className="hidden items-center gap-1.5 text-sm md:flex">{user.name} <Badge tone="ember">{user.role}</Badge></span>
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={signOut}><LogOut className="size-4" aria-hidden />Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div key={pathname} className="page-enter"><Outlet /></div>
      </main>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <>{children}</>;
}
