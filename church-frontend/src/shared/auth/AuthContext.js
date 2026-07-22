import { jsx as _jsx } from "react/jsx-runtime";
// This is the single source of truth for "who is logged in" on the
// frontend, mirroring the backend's single sign-on gate. Every feature
// reads the current user via useAuth() - none of them implement their
// own login state or call the /auth/login endpoint directly except the
// auth feature itself.
import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, setToken } from "./apiClient";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        apiFetch("/auth/me")
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);
    function login(token, u) {
        setToken(token);
        setUser(u);
    }
    function logout() {
        setToken(null);
        setUser(null);
        window.location.href = "/login";
    }
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, logout }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
