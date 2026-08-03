import { apiFetch } from "../../shared/auth/apiClient";

export interface Team {
  ID: string;
  Name: string;
}

export interface Sector {
  ID: string;
  Name: string;
}

export interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth?: string; // "YYYY-MM-DD"
  address: string;
  profileImageUrl?: string;
  teamId?: string;
  sectorId?: string;
}

export function fetchTeams() {
  return apiFetch<Team[]>("/teams");
}

export function fetchSectors() {
  return apiFetch<Sector[]>("/sectors");
}

export function updateProfile(data: ProfileUpdatePayload) {
  return apiFetch<void>("/profile/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  teamId?: string;
  sectorId?: string;
}

export function fetchProfile() {
  return apiFetch<UserProfile>("/profile/me");
}
