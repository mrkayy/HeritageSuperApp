import { apiFetch } from "../../shared/auth/apiClient";
import { AuthedUser } from "../../shared/auth/AuthContext";

interface LoginResponse {
  Token: string;
  Email: string;
  Roles: string[];
}

export async function loginRequest(email: string, password: string) {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user: AuthedUser = { ID: "", Email: res.Email, Roles: res.Roles };
  return { token: res.Token, user };
}
