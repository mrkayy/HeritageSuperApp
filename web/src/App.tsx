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
// import ClaimAccount from "./pages/auth/ClaimAccount";
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
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
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

import { MakerCheckerQueue } from "./pages/membership/MakerCheckerQueue";
import { FirstTimerCRM } from "./pages/membership/FirstTimerCRM";
import { DiscipleshipAcademy } from "./pages/membership/DiscipleshipAcademy";
import { VolunteerIntake } from "./pages/membership/VolunteerIntake";
import { CelebrationsLandmarks } from "./pages/membership/CelebrationsLandmarks";
import { SitRepPastoralLog } from "./pages/membership/SitRepPastoralLog";
import { VisitorProfilingQueue } from "./pages/membership/VisitorProfilingQueue";
import { InterBranchTransfers } from "./pages/membership/InterBranchTransfers";

import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import FeatureFlagGate from "./components/auth/FeatureFlagGate";
import TeamRouteGate from "./components/auth/TeamRouteGate";
import Forbidden from "./pages/Forbidden";

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
              {/* <Route path="/claim-account" element={
                <PublicRoute>
                  <ClaimAccount />
                </PublicRoute>
              } /> */}
              <Route path="/auth/magic-login" element={
                <PublicRoute>
                  <MagicLogin />
                </PublicRoute>
              } />
              <Route path="/public-map" element={<PublicMap />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />

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
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <MembershipDashboard />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/members" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <MembershipTeamCRM />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/birthdays" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <BirthdayTracker />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/anniversaries" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <AnniversaryTracker />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/journey" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <MemberJourney />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/profiling-queue" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <ProfilingQueue />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/membership/guide" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FeatureFlagGate flagKey="feature_membership_team">
                      <MembershipTeamGuide />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />

                {/* Membership Suite Features */}
                <Route path="membership/maker-checker" element={
                  <TeamRouteGate allowedTeam="membership">
                    <MakerCheckerQueue />
                  </TeamRouteGate>
                } />
                <Route path="membership/first-timer-crm" element={
                  <TeamRouteGate allowedTeam="membership">
                    <FirstTimerCRM />
                  </TeamRouteGate>
                } />
                <Route path="membership/academy" element={
                  <TeamRouteGate allowedTeam="membership">
                    <DiscipleshipAcademy />
                  </TeamRouteGate>
                } />
                <Route path="membership/volunteers" element={
                  <TeamRouteGate allowedTeam="membership">
                    <VolunteerIntake />
                  </TeamRouteGate>
                } />
                <Route path="membership/celebrations" element={
                  <TeamRouteGate allowedTeam="membership">
                    <CelebrationsLandmarks />
                  </TeamRouteGate>
                } />
                <Route path="membership/sitrep" element={
                  <TeamRouteGate allowedTeam="membership">
                    <SitRepPastoralLog />
                  </TeamRouteGate>
                } />
                <Route path="membership/visitor-profiling" element={
                  <TeamRouteGate allowedTeam="membership">
                    <VisitorProfilingQueue />
                  </TeamRouteGate>
                } />
                <Route path="membership/transfers" element={
                  <TeamRouteGate allowedTeam="membership">
                    <InterBranchTransfers />
                  </TeamRouteGate>
                } />

                {/* Information Center routes */}
                <Route path="teams/info-center" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <InfoCenterDashboard />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/members" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <InfoCenterMembers />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/journey" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <MemberJourney />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/new-visitor" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <VisitorIntake />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/attendance" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <AttendanceTracking />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/foundation-class" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <FoundationCandidates />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
                <Route path="teams/info-center/guide" element={
                  <TeamRouteGate allowedTeam="information_center">
                    <FeatureFlagGate flagKey="feature_info_center">
                      <InfoCenterGuide />
                    </FeatureFlagGate>
                  </TeamRouteGate>
                } />
              </Route>

              <Route path="/403" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FeatureFlagProvider>
    </AuthProvider>
);

export default App;
