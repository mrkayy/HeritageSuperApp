import api from "@/lib/api";
import { FollowUp } from "@/integrations/type_def";

export type { FollowUp };

export const followUpService = {
  // Get all follow-ups
  async getAllFollowUps(): Promise<FollowUp[]> {
    const response = await api.get("/follow-up");
    return response.data;
  },

  // Get a single follow-up by ID
  async getFollowUpById(id: string): Promise<FollowUp> {
    const response = await api.get(`/follow-up/${id}`);
    return response.data;
  },

  // Create a new follow-up
  async createFollowUp(
    data: Omit<FollowUp, "follow_up_id" | "id" | "created_at">
  ): Promise<FollowUp> {
    const response = await api.post("/follow-up", data);
    return response.data;
  },

  // Update an existing follow-up
  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    const response = await api.patch(`/follow-up/${id}`, data);
    return response.data;
  },

  // Delete a follow-up
  async deleteFollowUp(id: string): Promise<void> {
    await api.delete(`/follow-up/${id}`);
  },
};
