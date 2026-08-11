import api from "@/lib/api";

export interface Transportation {
  transportation_id?: string;
  soul_id: string;
  pickup_location?: string;
  dropoff_location?: string;
  scheduled_date?: string;
  status?: string;
  driver_id?: string;
  notes?: string;
  created_at?: string;
}

export const transportService = {
  // Get all transportation requests
  async getAllTransportation(): Promise<Transportation[]> {
    const response = await api.get("/transportation");
    return response.data;
  },

  // Get a single transportation request by ID
  async getTransportationById(id: string): Promise<Transportation> {
    const response = await api.get(`/transportation/${id}`);
    return response.data;
  },

  // Create a new transportation request
  async createTransportation(
    data: Omit<Transportation, "transportation_id" | "created_at">
  ): Promise<Transportation> {
    const response = await api.post("/transportation", data);
    return response.data;
  },

  // Update transportation status
  async updateTransportationStatus(
    id: string,
    status: string
  ): Promise<Transportation> {
    const response = await api.patch(`/transportation/${id}/status`, {
      status,
    });
    return response.data;
  },

  // Update an existing transportation request
  async updateTransportation(
    id: string,
    data: Partial<Transportation>
  ): Promise<Transportation> {
    const response = await api.patch(`/transportation/${id}`, data);
    return response.data;
  },

  // Delete a transportation request
  async deleteTransportation(id: string): Promise<void> {
    await api.delete(`/transportation/${id}`);
  },
};
