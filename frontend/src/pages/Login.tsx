import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { HOME, type DemoUser, type Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_ORDER: Role[] = ["citizen", "volunteer", "coordinator", "ngo"];

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-blue-800">ReliefRelay</h1>
        <p className="text-slate-600">From emergency signals to coordinated action.</p>
        <p className="mt-1 text-xs text-amber-800">All accounts and incidents below are synthetic demo data.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Demo role switcher</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            One click signs in as that account. Each browser tab keeps its own login, so open two tabs to be two people.
          </p>
          {demoUsers.length === 0 && <p className="text-sm text-slate-500">Demo accounts unavailable (backend offline or not in mock mode).</p>}
          {ROLE_ORDER.map((role) => (
            <div key={role}>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{role}</h4>
              <div className="flex flex-wrap gap-2">
                {demoUsers.filter((u) => u.role === role).map((u) => (
                  <Button key={u.id} variant="outline" onClick={() => go(u.email, u.password)}>
                    {u.name}
                    {role === "volunteer" && !u.verified && <Badge tone="amber">unverified</Badge>}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sign in with email</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void go(email, password); }}>
            <input className="rounded border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="rounded border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit">Sign in</Button>
          </form>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
