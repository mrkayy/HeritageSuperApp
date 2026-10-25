import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const EXECUTIVE_ROLES = ['super_admin', 'general_overseer', 'resident_pastor', 'church_admin'];

interface TeamRouteGateProps {
  allowedTeam: string;
  children: React.ReactNode;
}

// TeamRouteGate guards a route to users whose JWT teamName matches allowedTeam.
// Executive roles bypass this check — they have cross-team oversight.
// Non-matching users are redirected to /403 instead of silently loading the page.
const TeamRouteGate: React.FC<TeamRouteGateProps> = ({ allowedTeam, children }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const userRoles: string[] = (user.roles ?? [user.role]).filter(Boolean);
  const isExecutive = userRoles.some(r => EXECUTIVE_ROLES.includes(r));
  if (isExecutive) return <>{children}</>;

  const teamName = (user.teamName ?? '').toLowerCase();
  const required = allowedTeam.toLowerCase();

  if (teamName.includes(required) || required.includes(teamName) && teamName !== '') {
    return <>{children}</>;
  }

  return <Navigate to="/403" replace />;
};

export default TeamRouteGate;
