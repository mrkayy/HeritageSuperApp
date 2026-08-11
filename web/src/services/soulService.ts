import api from "@/lib/api";
import { Soul } from "@repo/dto";

// export interface Soul {
//   soul_id?: string;
//   first_name: string;
//   last_name: string;
//   email?: string;
//   phone?: string;
//   address?: string;
//   church_id?: string;
//   sector_id?: string;
//   team_id?: string;
//   converted_by?: string;
//   status?: string;
//   notes?: string;
//   created_at?: string;
// }

export const soulService = {
  // Get all souls
  async getAllSouls(): Promise<Soul[]> {
    const response = await api.get("/souls");
    return response.data;
  },

  // Get a single soul by ID
  async getSoulById(id: string): Promise<Soul> {
    const response = await api.get(`/souls/${id}`);
    return response.data;
  },

  // Create a new soul
  async createSoul(data: Omit<Soul, "soul_id" | "created_at">): Promise<Soul> {
    const response = await api.post("/souls", data);
    return response.data;
  },

  // Update an existing soul
  async updateSoul(id: string, data: Partial<Soul>): Promise<Soul> {
    const response = await api.patch(`/souls/${id}`, data);
    return response.data;
  },

  // Delete a soul
  async deleteSoul(id: string): Promise<void> {
    await api.delete(`/souls/${id}`);
  },
};
