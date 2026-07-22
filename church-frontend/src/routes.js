import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(Suspense, { fallback: _jsx("div", { children: "Loading..." }), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(MembershipPage, {}) }) })] }) }));
}
