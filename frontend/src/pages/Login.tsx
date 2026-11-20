import { useEffect, useRef, useState } from "react";
import { HeartHandshake, Home, KeyRound, ShieldAlert, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { HOME, type DemoUser, type Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, hasFinePointer, prefersReducedMotion } from "@/components/kit";

const ROLE_ORDER: Role[] = ["citizen", "volunteer", "coordinator", "ngo"];
const ROLE_ICON: Record<Role, LucideIcon> = { citizen: Home, volunteer: HeartHandshake, coordinator: ShieldCheck, ngo: Users };

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const parallax = hasFinePointer() && !prefersReducedMotion();
  // Layered hero: each .layer shifts by its own depth as the pointer moves (skipped for touch and reduced motion).
  const onMove = (e: React.PointerEvent) => {
    if (!parallax || !stage.current) return;
    const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
    stage.current.querySelectorAll<HTMLElement>(".layer").forEach((el) => {
      const d = Number(el.dataset.depth ?? 0);
      el.style.transform = `translate3d(${(-x * d).toFixed(1)}px, ${(-y * d).toFixed(1)}px, ${d}px)`;
    });
  };

  useEffect(() => {
    api<DemoUser[]>("/api/auth/demo-users").then(setDemoUsers).catch(() => setDemoUsers([]));
  }, []);

  if (user) return <Navigate to={HOME[user.role]} replace />;

  const go = async (e: string, p: string) => {
    setError("");
    try {
      const u = await signIn(e, p);
      navigate(HOME[u.role]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mission hero min-h-screen overflow-hidden" onPointerMove={onMove}>
      <div ref={stage} className="parallax relative mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <div aria-hidden className="layer pointer-events-none absolute -left-10 top-4 size-56 rounded-full bg-blue-500/30 blur-3xl" data-depth="40" />
        <div aria-hidden className="layer pointer-events-none absolute -right-6 top-40 size-64 rounded-full bg-violet-500/25 blur-3xl" data-depth="70" />
        <div aria-hidden className="layer pointer-events-none absolute -right-8 top-6 hidden rotate-6 lg:block" data-depth="90">
          <GlassCard className="flex items-center gap-2 px-3 py-2 text-xs"><span className="led led-glow tone-red" /> Critical · water · 2 min ago</GlassCard>
        </div>
        <div aria-hidden className="layer pointer-events-none absolute -left-28 top-72 hidden -rotate-3 lg:block" data-depth="60">
          <GlassCard className="flex items-center gap-2 px-3 py-2 text-xs"><span className="led led-glow tone-blue" /> Verified · volunteer matched</GlassCard>
        </div>

        <div className="layer relative space-y-2" data-depth="20">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><ShieldAlert className="size-7 text-blue-400" aria-hidden /> ReliefRelay</p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">From emergency signals to coordinated action.</h1>
          <p className="text-slate-300" style={{ color: "var(--muted)" }}>AI suggests. A human coordinator verifies and approves every assignment.</p>
          <p className="text-xs" style={{ color: "#fcd34d" }}>All accounts and incidents below are synthetic demo data.</p>
        </div>

        <GlassCard className="layer relative mt-8 p-5 sm:p-6" data-depth="0">
          <h2 className="font-display text-lg font-semibold">Demo role switcher</h2>
          <p className="mb-4 mt-1 text-sm" style={{ color: "var(--muted)" }}>
            One click signs in as that account. Each browser tab keeps its own login, so open two tabs to be two people.
          </p>
          {demoUsers.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Demo accounts unavailable (backend offline or not in mock mode).</p>}
          <div className="space-y-4">
            {ROLE_ORDER.map((role) => {
              const Icon = ROLE_ICON[role];
              const users = demoUsers.filter((u) => u.role === role);
              if (users.length === 0) return null;
              return (
                <div key={role}>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    <Icon className="size-3.5" aria-hidden />{role}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => (
                      <Button key={u.id} variant="outline" className="h-11" onClick={() => go(u.email, u.password)}>
                        {u.name}
                        {role === "volunteer" && !u.verified && <Badge tone="amber">unverified</Badge>}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <Card className="layer relative mt-6" data-depth="0">
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-4" aria-hidden />Sign in with email</CardTitle></CardHeader>
          <CardContent>
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void go(email, password); }}>
              <input className="min-w-0 flex-1 basis-48 rounded-md border px-3 py-2" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="min-w-0 flex-1 basis-48 rounded-md border px-3 py-2" type="password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit">Sign in</Button>
            </form>
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
