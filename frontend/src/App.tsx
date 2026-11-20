import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, RequireRole } from "@/components/Layout";
import CommandCentre from "@/pages/CommandCentre";
import IncidentDetail from "@/pages/IncidentDetail";
import IncidentList from "@/pages/IncidentList";
import Login from "@/pages/Login";
import VolunteerDashboard from "@/pages/VolunteerDashboard";
import Messages from "@/pages/Messages";
import NewRequest from "@/pages/NewRequest";
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
        <Route path="/citizen" element={<RequireRole roles={["citizen"]}><IncidentList title="My requests" /></RequireRole>} />
        <Route path="/citizen/new" element={<RequireRole roles={["citizen"]}><NewRequest /></RequireRole>} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/volunteer" element={<RequireRole roles={["volunteer"]}><VolunteerDashboard /></RequireRole>} />
        <Route path="/coordinator" element={<RequireRole roles={["coordinator"]}><CommandCentre /></RequireRole>} />
        <Route path="/messages" element={<RequireRole roles={["coordinator", "volunteer"]}><Messages /></RequireRole>} />
        <Route path="/resources" element={<RequireRole roles={["coordinator", "ngo"]}><Placeholder title="Resources" /></RequireRole>} />
      </Route>
    </Routes>
  );
}
