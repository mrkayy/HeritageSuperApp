import { apiFetch } from "../../shared/auth/apiClient";

export interface Member {
  id: string;
  firstName: string;
  surname: string;
  email: string | null;
  phoneNumber: string | null;
  homeAddress: string | null;
  gender: 'male' | 'female' | null;
  dateOfBirthDay: number | null;
  dateOfBirthMonth: number | null;
  maritalStatus: 'single' | 'married' | 'widowed' | 'divorced' | 'separated' | null;
  weddingAnniversaryDay: number | null;
  weddingAnniversaryMonth: number | null;
  jobOccupation: string | null;
  photoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  isPlaceholder: boolean;
  sourceTeam: string | null;
  createdBy: string | null;
  localChurchId?: string | null;
  localChurchName?: string | null;
  sectorId?: string | null;
  sectorName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
  name: string;
}

export interface CreateMemberPayload {
  firstName: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
  homeAddress?: string;
  gender?: 'male' | 'female';
  dateOfBirthDay?: number;
  dateOfBirthMonth?: number;
  maritalStatus?: 'single' | 'married' | 'widowed' | 'divorced' | 'separated';
  weddingAnniversaryDay?: number;
  weddingAnniversaryMonth?: number;
  jobOccupation?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalNotes?: string;
  isPlaceholder?: boolean;
  sourceTeam?: string;
  currentStage?: string;
  localChurchId?: string;
  sectorId?: string;
  teamId?: string;
}

export function listMembers() {
  return apiFetch<Member[]>("/members");
}

export function createMember(payload: CreateMemberPayload) {
  return apiFetch<Member>("/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function updateMember(id: string, payload: CreateMemberPayload) {
  return apiFetch<Member>(`/members/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteMember(id: string) {
  return apiFetch<void>(`/members/${id}`, {
    method: "DELETE",
  });
}
