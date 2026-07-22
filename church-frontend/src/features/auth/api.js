import { apiFetch } from "../../shared/auth/apiClient";
export async function loginRequest(email, password) {
    const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    const user = { ID: "", Email: res.Email, Roles: res.Roles };
    return { token: res.Token, user };
}
