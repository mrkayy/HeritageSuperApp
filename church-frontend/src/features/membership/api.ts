import { apiFetch } from "../../shared/auth/apiClient";

export interface Member {
  ID: string;
  Name: string;
  Email: string;
}

// apiFetch already attaches the SSO token - this feature never thinks
// about auth at all, it just calls its own backend module's endpoint.
export function listMembers() {
  return apiFetch<Member[]>("/members");
}
