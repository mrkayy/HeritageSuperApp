import { apiFetch } from "../../shared/auth/apiClient";
import { Member, CreateMemberPayload } from "../membership/api";

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  teamId?: string;
  teamName?: string;
  sectorId?: string;
  sectorName?: string;
  profileImageUrl?: string;
  maritalStatus?: string;
  weddingAnniversaryDay?: number;
  weddingAnniversaryMonth?: number;
  jobOccupation?: string;
  allergies?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export function fetchProfile() {
  return apiFetch<UserProfile>("/profile/me");
}

export function updateProfile(data: any) {
  return apiFetch<void>("/profile/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function fetchKids() {
  return apiFetch<Member[]>("/profile/me/kids");
}

export function createKid(payload: CreateMemberPayload) {
  return apiFetch<Member>("/profile/me/kids", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function updateKid(id: string, payload: CreateMemberPayload) {
  return apiFetch<Member>(`/profile/me/kids/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteKid(id: string) {
  return apiFetch<void>(`/profile/me/kids/${id}`, {
    method: "DELETE",
  });
}
