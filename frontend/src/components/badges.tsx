import { StatusPill, type Tone } from "@/components/kit";
import type { IncidentStatus, Urgency } from "@/lib/types";
import { label } from "@/lib/utils";

// LED colours: critical = glowing red, verified = blue, resolved = green.
const STATUS_TONE: Record<IncidentStatus, Tone> = {
  submitted: "gray", verified: "blue", assigned: "purple", in_progress: "amber", resolved: "green", rejected: "red",
};
const URGENCY_TONE: Record<Urgency, Tone> = { low: "gray", medium: "blue", high: "amber", critical: "red" };

export const StatusBadge = ({ status }: { status: IncidentStatus }) => (
  <StatusPill tone={STATUS_TONE[status]} glow={status === "verified" || status === "resolved"}>{label(status)}</StatusPill>
);
export const UrgencyBadge = ({ urgency }: { urgency: Urgency }) => (
  <StatusPill tone={URGENCY_TONE[urgency]} glow={urgency === "critical"} pulse={urgency === "critical"}>{urgency}</StatusPill>
);
export const SyntheticBadge = () => <StatusPill tone="amber">synthetic</StatusPill>;

export const URGENCY_COLOR: Record<Urgency, string> = {
  low: "#64748b", medium: "#2563eb", high: "#d97706", critical: "#dc2626",
};
