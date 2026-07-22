import { apiFetch } from "../../shared/auth/apiClient";
// apiFetch already attaches the SSO token - this feature never thinks
// about auth at all, it just calls its own backend module's endpoint.
export function listMembers() {
    return apiFetch("/members");
}
