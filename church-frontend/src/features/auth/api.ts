import { apiFetch } from "../../shared/auth/apiClient";
import { AuthedUser } from "../../shared/auth/AuthContext";

interface LoginResponse {
  Token: string;
  Email: string;
  Roles: string[];
}

// Decode JWT payload to extract sub (user ID) without a library
function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export async function loginRequest(email: string, password: string) {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const payload = parseJwtPayload(res.Token);
  const user: AuthedUser = {
    ID: (payload.sub as string) ?? "",
    Email: res.Email,
    Roles: res.Roles,
    isProfileComplete: false, // will be checked by AuthContext after redirect
  };

  return { token: res.Token, user };
}
