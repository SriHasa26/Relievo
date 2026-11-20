// Shapes returned by the backend API (kept in sync by hand with backend/src/types.ts).
export type Role = "citizen" | "volunteer" | "coordinator" | "ngo";

export interface User {
  id: string; name: string; email: string; role: Role; phone: string; verified: boolean; is_synthetic: boolean;
}
export interface DemoUser extends User { password: string }

export const HOME: Record<Role, string> = {
  citizen: "/citizen", volunteer: "/volunteer", coordinator: "/coordinator", ngo: "/resources",
};
