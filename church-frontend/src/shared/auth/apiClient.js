// Every feature imports THIS, never fetch() directly. It attaches the
// SSO token to every request and centralizes the "logged out" handling,
// so a token expiry is handled once for the whole app, not per feature.
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
function getToken() {
    return localStorage.getItem("hof_token");
}
export function setToken(token) {
    if (token)
        localStorage.setItem("hof_token", token);
    else
        localStorage.removeItem("hof_token");
}
export async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    if (res.status === 401) {
        setToken(null);
        window.location.href = "/login";
        throw new Error("session expired");
    }
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `request failed: ${res.status}`);
    }
    return res.json();
}
