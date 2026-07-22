import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Wrap any feature route with this instead of writing feature-specific
// auth checks. Optionally pass `role` for module-specific authorization
// (e.g. <ProtectedRoute role="finance_admin">).
export function ProtectedRoute({
  children,
  role,
}: {
  children: JSX.Element;
  role?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && !user.Roles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
