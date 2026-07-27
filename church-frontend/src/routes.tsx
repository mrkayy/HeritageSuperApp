import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";

const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const AdminLoginPage = lazy(() => import("./features/auth/AdminLoginPage"));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const OnboardingPage = lazy(() => import("./features/onboarding/OnboardingPage"));
const MembershipPage = lazy(() => import("./features/membership/MembershipPage"));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen animate-fade-in">
          <div className="spinner spinner-lg" />
          <span>Loading Page...</span>
        </div>
      }
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Protected Onboarding (ignores profile-complete requirement) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute skipProfileCheck>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected App Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute allowedRoles={["team_lead", "resident_pastor", "church_admin"]}>
              <MembershipPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
