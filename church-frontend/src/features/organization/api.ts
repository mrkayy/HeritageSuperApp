import { apiFetch } from "../../shared/auth/apiClient";

export interface Church {
  ID: string;
  Name: string;
  Center: string;
  Description: string;
  Slug: string;
}

export interface Sector {
  ID: string;
  Name: string;
  Description?: string;
  ChurchID?: string;
  ChurchName?: string;
  MemberCount?: number;
}

export interface Team {
  ID: string;
  Name: string;
  Description?: string;
  ChurchID?: string;
  SectorID?: string;
}

// Churches CRUD
export function listChurches() {
  return apiFetch<Church[]>("/churches");
}

export function getChurch(id: string) {
  return apiFetch<Church>(`/churches/${id}`);
}

export function createChurch(payload: Omit<Church, "ID">) {
  return apiFetch<Church>("/churches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateChurch(id: string, payload: Omit<Church, "ID">) {
  return apiFetch<Church>(`/churches/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteChurch(id: string) {
  return apiFetch<void>(`/churches/${id}`, {
    method: "DELETE",
  });
}

// Sectors CRUD
export function listSectors() {
  return apiFetch<Sector[]>("/sectors");
}

export function getSector(id: string) {
  return apiFetch<Sector>(`/sectors/${id}`);
}

export function createSector(payload: { name: string; description?: string; churchId?: string }) {
  return apiFetch<Sector>("/sectors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSector(id: string, payload: { name: string; description?: string; churchId?: string }) {
  return apiFetch<Sector>(`/sectors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSector(id: string) {
  return apiFetch<void>(`/sectors/${id}`, {
    method: "DELETE",
  });
}

// Teams CRUD
export function listTeams() {
  return apiFetch<Team[]>("/teams");
}

export function getTeam(id: string) {
  return apiFetch<Team>(`/teams/${id}`);
}

export function createTeam(payload: { name: string; description?: string; churchId?: string; sectorId?: string }) {
  return apiFetch<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTeam(id: string, payload: { name: string; description?: string; churchId?: string; sectorId?: string }) {
  return apiFetch<Team>(`/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTeam(id: string) {
  return apiFetch<void>(`/teams/${id}`, {
    method: "DELETE",
  });
}
