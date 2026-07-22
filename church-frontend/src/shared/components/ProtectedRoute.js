import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
// Wrap any feature route with this instead of writing feature-specific
// auth checks. Optionally pass `role` for module-specific authorization
// (e.g. <ProtectedRoute role="finance_admin">).
export function ProtectedRoute({ children, role, }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { children: "Loading..." });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (role && !user.Roles.includes(role))
        return _jsx(Navigate, { to: "/", replace: true });
    return children;
}
