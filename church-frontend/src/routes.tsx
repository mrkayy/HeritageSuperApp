// Mirrors cmd/server/main.go on the backend: this is the ONLY frontend
// file allowed to import from more than one feature folder. Adding a
// new ministry module's UI means adding one lazy import + one <Route>
// here - nothing inside any feature folder needs to change.
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";

const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const MembershipPage = lazy(() => import("./features/membership/MembershipPage"));
// const EventsPage = lazy(() => import("./features/events/EventsPage"));
// const GivingPage = lazy(() => import("./features/giving/GivingPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MembershipPage />
            </ProtectedRoute>
          }
        />
        {/*
        <Route path="/events" element={
          <ProtectedRoute><EventsPage /></ProtectedRoute>
        } />
        <Route path="/giving" element={
          <ProtectedRoute role="finance_admin"><GivingPage /></ProtectedRoute>
        } />
        */}
      </Routes>
    </Suspense>
  );
}
