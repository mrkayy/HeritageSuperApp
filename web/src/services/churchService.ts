import api from "@/lib/api";
import { LocalChurch } from "@/integrations/type_def";

export type { LocalChurch };

export const churchService = {
  // Get all churches
  async getAllChurches(): Promise<LocalChurch[]> {
    const response = await api.get("/churches");
    return response.data;
  },

  // Get a single church by ID
  async getChurchById(id: string): Promise<LocalChurch> {
    const response = await api.get(`/churches/${id}`);
    return response.data;
  },

  // Create a new church
  async createChurch(
    data: Omit<LocalChurch, "id" | "church_id" | "created_at">
  ): Promise<LocalChurch> {
    const response = await api.post("/churches", data);
    return response.data;
  },

  // Update an existing church
  async updateChurch(
    id: string,
    data: Partial<LocalChurch>
  ): Promise<LocalChurch> {
    const response = await api.put(`/churches/${id}`, data);
    return response.data;
  },

  // Delete a church
  async deleteChurch(id: string): Promise<void> {
    await api.delete(`/churches/${id}`);
  },
};
