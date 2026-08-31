import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/auth/Login";
import AdminLogin from "./pages/auth/AdminLogin";
import Register from "./pages/auth/Register";
import ClaimAccount from "./pages/auth/ClaimAccount";
import MagicLogin from "./pages/auth/MagicLogin";
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
import SuperAdminChurches from "./pages/admin/SuperAdminChurches";
import SuperAdminInvites from "./pages/admin/SuperAdminInvites";
import SuperAdminSettings from "./pages/admin/SuperAdminSettings";
import SuperAdminAuditLogs from "./pages/admin/SuperAdminAuditLogs";
import SuperAdminGuide from "./pages/admin/SuperAdminGuide";
import GeneralOverseerDossier from "./pages/admin/GeneralOverseerDossier";
import ExecutiveAnalytics from "./pages/admin/ExecutiveAnalytics";
import MemberInvites from "./pages/admin/MemberInvites";
import FollowUpManagement from "./pages/admin/FollowUpManagement";
import MemberAssignment from "./pages/admin/MemberAssignment";
import PublicMap from "./pages/PublicMap";
import NotFound from "./pages/NotFound";
import MembershipDashboard from "./pages/teams/MembershipDashboard";
import MembershipTeamCRM from "./pages/teams/MembershipTeamCRM";
import BirthdayTracker from "./pages/teams/BirthdayTracker";
import AnniversaryTracker from "./pages/teams/AnniversaryTracker";
import MemberJourney from "./pages/teams/MemberJourney";
import InfoCenterDashboard from "./pages/teams/InfoCenterDashboard";
import InfoCenterMembers from "./pages/teams/InfoCenterMembers";
import VisitorIntake from "./pages/teams/VisitorIntake";
import AttendanceTracking from "./pages/teams/AttendanceTracking";
import FoundationCandidates from "./pages/teams/FoundationCandidates";
import ProfilingQueue from "./pages/teams/ProfilingQueue";
import MembershipTeamGuide from "./pages/teams/MembershipTeamGuide";
import InfoCenterGuide from "./pages/teams/InfoCenterGuide";

import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import FeatureFlagGate from "./components/auth/FeatureFlagGate";

const App = () => (
  <AuthProvider>
      <FeatureFlagProvider>
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
              <Route path="/claim-account" element={
                <PublicRoute>
                  <ClaimAccount />
                </PublicRoute>
              } />
              <Route path="/auth/magic-login" element={
                <PublicRoute>
                  <MagicLogin />
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
                <Route path="souls/register" element={
                  <FeatureFlagGate flagKey="feature_souls">
                    <SoulRegistration />
                  </FeatureFlagGate>
                } />
                <Route path="souls/journal" element={
                  <FeatureFlagGate flagKey="feature_soul_journal">
                    <SoulJournal />
                  </FeatureFlagGate>
                } />
                <Route path="follow-up" element={
                  <FeatureFlagGate flagKey="feature_followup">
                    <FollowUp />
                  </FeatureFlagGate>
                } />
                <Route path="map" element={<MapView />} />
                <Route path="transport" element={
                  <FeatureFlagGate flagKey="feature_transport">
                    <Transport />
                  </FeatureFlagGate>
                } />
                <Route path="leaderboard" element={
                  <FeatureFlagGate flagKey="feature_leaderboard">
                    <Leaderboard />
                  </FeatureFlagGate>
                } />
                <Route path="admin" element={
                  <FeatureFlagGate flagKey="feature_admin_panel">
                    <Admin />
                  </FeatureFlagGate>
                } />
                <Route path="admin/management" element={
                  <FeatureFlagGate flagKey="feature_admin_panel">
                    <AdminManagement />
                  </FeatureFlagGate>
                } />
                <Route path="admin/member-invites" element={
                  <FeatureFlagGate flagKey="feature_admin_panel">
                    <MemberInvites />
                  </FeatureFlagGate>
                } />
                <Route path="admin/follow-up-management" element={
                  <FeatureFlagGate flagKey="feature_admin_panel">
                    <FollowUpManagement />
                  </FeatureFlagGate>
                } />
                <Route path="admin/member-assignment" element={
                  <FeatureFlagGate flagKey="feature_admin_panel">
                    <MemberAssignment />
                  </FeatureFlagGate>
                } />
                <Route path="super-admin" element={<SuperAdmin />} />
                <Route path="super-admin/churches" element={<SuperAdminChurches />} />
                <Route path="super-admin/leadership-invites" element={<SuperAdminInvites />} />
                <Route path="super-admin/audit-logs" element={<SuperAdminAuditLogs />} />
                <Route path="super-admin/settings" element={<SuperAdminSettings />} />
                <Route path="super-admin/guide" element={<SuperAdminGuide />} />
                <Route path="general-overseer/dossier" element={<GeneralOverseerDossier />} />
                <Route path="analytics/executive" element={<ExecutiveAnalytics />} />

                {/* Team specific capability routes */}
                <Route path="teams/membership" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <MembershipDashboard />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/members" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <MembershipTeamCRM />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/birthdays" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <BirthdayTracker />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/anniversaries" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <AnniversaryTracker />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/journey" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <MemberJourney />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/profiling-queue" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <ProfilingQueue />
                  </FeatureFlagGate>
                } />
                <Route path="teams/membership/guide" element={
                  <FeatureFlagGate flagKey="feature_membership_team">
                    <MembershipTeamGuide />
                  </FeatureFlagGate>
                } />

                {/* Information Center routes */}
                <Route path="teams/info-center" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <InfoCenterDashboard />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/members" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <InfoCenterMembers />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/journey" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <MemberJourney />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/new-visitor" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <VisitorIntake />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/attendance" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <AttendanceTracking />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/foundation-class" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <FoundationCandidates />
                  </FeatureFlagGate>
                } />
                <Route path="teams/info-center/guide" element={
                  <FeatureFlagGate flagKey="feature_info_center">
                    <InfoCenterGuide />
                  </FeatureFlagGate>
                } />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FeatureFlagProvider>
    </AuthProvider>
);

export default App;
