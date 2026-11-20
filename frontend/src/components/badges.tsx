import { Badge } from "@/components/ui/badge";
import type { IncidentStatus, Urgency } from "@/lib/types";
import { label } from "@/lib/utils";

const STATUS_TONE: Record<IncidentStatus, "gray" | "blue" | "green" | "amber" | "red" | "purple"> = {
  submitted: "gray", verified: "blue", assigned: "purple", in_progress: "amber", resolved: "green", rejected: "red",
};
const URGENCY_TONE = { low: "gray", medium: "blue", high: "amber", critical: "red" } as const;

export const StatusBadge = ({ status }: { status: IncidentStatus }) => (
  <Badge tone={STATUS_TONE[status]}>{label(status)}</Badge>
);
export const UrgencyBadge = ({ urgency }: { urgency: Urgency }) => (
  <Badge tone={URGENCY_TONE[urgency]}>{urgency}</Badge>
);
export const SyntheticBadge = () => <Badge tone="amber">synthetic</Badge>;

export const URGENCY_COLOR: Record<Urgency, string> = {
  low: "#64748b", medium: "#2563eb", high: "#d97706", critical: "#dc2626",
};
