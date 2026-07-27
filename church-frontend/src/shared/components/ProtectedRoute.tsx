import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Wrap any feature route with this instead of writing feature-specific
// auth checks. Optionally pass `role` for module-specific authorization
// (e.g. <ProtectedRoute role="finance_admin">).
// If `skipProfileCheck` is true, the profile completion check is skipped
// (used for the onboarding page itself).
export function ProtectedRoute({
  children,
  role,
  allowedRoles,
  skipProfileCheck,
}: {
  children: JSX.Element;
  role?: string;
  allowedRoles?: string[];
  skipProfileCheck?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  if (role && !user.Roles.includes(role)) return <Navigate to="/" replace />;
  
  if (allowedRoles && !allowedRoles.some(r => user.Roles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  // Force onboarding if profile is incomplete
  if (!skipProfileCheck && !user.isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
