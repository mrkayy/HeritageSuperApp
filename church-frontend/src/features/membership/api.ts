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

export function createMember(name: string, email: string) {
  return apiFetch<Member>("/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email }),
  });
}

export function deleteMember(id: string) {
  return apiFetch<void>(`/members/${id}`, {
    method: "DELETE",
  });
}
