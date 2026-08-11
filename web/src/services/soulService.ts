import api from "@/lib/api";
import { Soul } from "@/integrations/type_def";

export type { Soul };

export const soulService = {
  // Get all souls
  async getAllSouls(): Promise<Soul[]> {
    const response = await api.get("/souls");
    return response.data;
  },

  // Create a soul
  async createSoul(soul: Omit<Soul, "soul_id" | "created_at">): Promise<Soul> {
    const response = await api.post("/souls", soul);
    return response.data;
  },

  // Update a soul
  async updateSoul(id: string, soul: Partial<Soul>): Promise<Soul> {
    const response = await api.put(`/souls/${id}`, soul);
    return response.data;
  },

  // Delete a soul
  async deleteSoul(id: string): Promise<void> {
    await api.delete(`/souls/${id}`);
  },
};
