import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/auth/Login";
import AdminLogin from "./pages/auth/AdminLogin";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import SoulRegistration from "./pages/SoulRegistration";
import SoulJournal from "./pages/SoulJournal";
import FollowUp from "./pages/FollowUp";
import MapView from "./pages/MapView";
import Transport from "./pages/Transport";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/admin/Admin";
import AdminManagement from "./pages/admin/AdminManagement";
import SuperAdmin from "./pages/admin/SuperAdmin";
import SuperAdminDenominations from "./pages/admin/SuperAdminDenominations";
import SuperAdminInvites from "./pages/admin/SuperAdminInvites";
import SuperAdminSettings from "./pages/admin/SuperAdminSettings";
import MemberInvites from "./pages/admin/MemberInvites";
import FollowUpManagement from "./pages/admin/FollowUpManagement";
import MemberAssignment from "./pages/admin/MemberAssignment";
import PublicMap from "./pages/PublicMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/admin-login" element={
              <PublicRoute>
                <AdminLogin />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/public-map" element={<PublicMap />} />

            {/* Protected routes with sidebar layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <AppLayout />
                </SidebarProvider>
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="souls/register" element={<SoulRegistration />} />
              <Route path="souls/journal" element={<SoulJournal />} />
              <Route path="follow-up" element={<FollowUp />} />
              <Route path="map" element={<MapView />} />
              <Route path="transport" element={<Transport />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="admin" element={<Admin />} />
              <Route path="admin/management" element={<AdminManagement />} />
              <Route path="admin/member-invites" element={<MemberInvites />} />
              <Route path="admin/follow-up-management" element={<FollowUpManagement />} />
              <Route path="admin/member-assignment" element={<MemberAssignment />} />
              <Route path="super-admin" element={<SuperAdmin />} />
              <Route path="super-admin/denominations" element={<SuperAdminDenominations />} />
              <Route path="super-admin/invites" element={<SuperAdminInvites />} />
              <Route path="super-admin/settings" element={<SuperAdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
