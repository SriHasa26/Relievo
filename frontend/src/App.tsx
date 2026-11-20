import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, RequireRole } from "@/components/Layout";
import Login from "@/pages/Login";
import { useAuth } from "@/lib/auth";
import { HOME } from "@/lib/types";

// CP1: role-based routing with placeholder home pages. Real pages arrive in later checkpoints.
const Placeholder = ({ title }: { title: string }) => <h1 className="text-xl font-semibold">{title} (coming soon)</h1>;

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME[user.role] : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/citizen" element={<RequireRole roles={["citizen"]}><Placeholder title="My requests" /></RequireRole>} />
        <Route path="/volunteer" element={<RequireRole roles={["volunteer"]}><Placeholder title="My assignments" /></RequireRole>} />
        <Route path="/coordinator" element={<RequireRole roles={["coordinator"]}><Placeholder title="Command centre" /></RequireRole>} />
        <Route path="/resources" element={<RequireRole roles={["coordinator", "ngo"]}><Placeholder title="Resources" /></RequireRole>} />
      </Route>
    </Routes>
  );
}
