import api from "@/lib/api";
import { Sector } from "@/integrations/type_def";

export type { Sector };

export const sectorService = {
  // Get all sectors
  async getAllSectors(): Promise<Sector[]> {
    const response = await api.get("/sectors");
    return response.data;
  },

  // Get sectors by church ID
  async getSectorsByChurch(churchId: string): Promise<Sector[]> {
    const response = await api.get("/sectors");
    return (response.data || []).filter((s: any) => s.churchId === churchId || s.church_id === churchId || s.ChurchID === churchId);
  },

  // Create a new sector
  async createSector(
    data: Omit<Sector, "id" | "sector_id" | "created_at">
  ): Promise<Sector> {
    const response = await api.post("/sectors", data);
    return response.data;
  },

  // Update an existing sector
  async updateSector(id: string, data: Partial<Sector>): Promise<Sector> {
    const response = await api.put(`/sectors/${id}`, data);
    return response.data;
  },

  // Delete a sector
  async deleteSector(id: string): Promise<void> {
    await api.delete(`/sectors/${id}`);
  },
};
