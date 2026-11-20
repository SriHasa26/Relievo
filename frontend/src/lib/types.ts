// Shapes returned by the backend API (kept in sync by hand with backend/src/types.ts).
export type Role = "citizen" | "volunteer" | "coordinator" | "ngo";

export interface User {
  id: string; name: string; email: string; role: Role; phone: string; verified: boolean; is_synthetic: boolean;
}
export interface DemoUser extends User { password: string }

export const HOME: Record<Role, string> = {
  citizen: "/citizen", volunteer: "/volunteer", coordinator: "/coordinator", ngo: "/resources",
};

export type Category = "medical" | "food" | "water" | "shelter" | "rescue" | "other";
export type Urgency = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "submitted" | "verified" | "assigned" | "in_progress" | "resolved" | "rejected";
export type AssignmentStatus = "approved" | "accepted" | "declined" | "reassigned" | "completed";

export interface Incident {
  id: string; reporter_id: string; original_text: string; title: string;
  category: Category; urgency: Urgency; people_affected: number | null;
  needs: string[]; vulnerable_persons: string[];
  lat: number; lng: number; address_text: string;
  status: IncidentStatus; reject_reason: string | null; possible_duplicate_of: string | null;
  is_synthetic: boolean; created_at: string;
}
export interface IncidentListItem extends Incident {
  assignee: { id: string; name: string; status: AssignmentStatus; assignment_id: string } | null;
}

export interface Extraction {
  category: Category; urgency: Urgency; people_affected: number | null;
  needs: string[]; vulnerable_persons: string[]; missing_info: string[]; summary: string;
  requires_human_verification: true;
}
export interface Analysis {
  incident_id: string; extracted_data: Extraction; confidence: number; model_version: string;
  source: "openrouter" | "gemini" | "fallback" | "mock";
}

export interface ScoreBreakdown { D: number; K: number; A: number; C: number; total: number; distance_km: number }
export interface Assignment {
  id: string; incident_id: string; volunteer_id: string; assigned_by: string; status: AssignmentStatus;
  score_breakdown: ScoreBreakdown | null; created_at: string; responded_at: string | null;
  volunteer_name: string; assigned_by_name: string;
}
export interface IncidentDetailData {
  incident: Incident;
  reporter: { id: string; name: string } | null;
  analysis: Analysis | null;
  assignments: Assignment[];
  allocations: Array<{ id: string; resource_name: string; allocated_quantity: number }>;
  has_room: boolean;
}
export interface IncidentEvent {
  id: string; incident_id: string; actor_id: string | null; actor_name: string;
  action: string; meta: Record<string, unknown>; created_at: string;
}
export interface MatchResult {
  volunteer_id: string; name: string; eligible: boolean; excluded_reason: string | null;
  breakdown: ScoreBreakdown | null; reason: string;
}
