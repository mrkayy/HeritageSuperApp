import api from "@/lib/api";

export interface FollowUp {
  follow_up_id?: string;
  soul_id: string;
  status?: string;
  notes?: string;
  scheduled_date?: string;
  completed_date?: string;
  assigned_to?: string;
  created_at?: string;
}

export const followUpService = {
  // Get all follow-ups
  async getAllFollowUps(): Promise<FollowUp[]> {
    const response = await api.get("/follow-ups");
    return response.data;
  },

  // Get pending follow-ups
  async getPendingFollowUps(): Promise<FollowUp[]> {
    const response = await api.get("/follow-ups/pending");
    return response.data;
  },

  // Get a single follow-up by ID
  async getFollowUpById(id: string): Promise<FollowUp> {
    const response = await api.get(`/follow-ups/${id}`);
    return response.data;
  },

  // Create a new follow-up
  async createFollowUp(
    data: Omit<FollowUp, "follow_up_id" | "created_at">
  ): Promise<FollowUp> {
    const response = await api.post("/follow-ups", data);
    return response.data;
  },

  // Update follow-up status
  async updateFollowUpStatus(id: string, status: string): Promise<FollowUp> {
    const response = await api.patch(`/follow-ups/${id}/status`, { status });
    return response.data;
  },

  // Update an existing follow-up
  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    const response = await api.patch(`/follow-ups/${id}`, data);
    return response.data;
  },

  // Delete a follow-up
  async deleteFollowUp(id: string): Promise<void> {
    await api.delete(`/follow-ups/${id}`);
  },
};
