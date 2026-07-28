import { apiService } from '@/services/api';
import type {
  ComplaintCapabilities,
  ComplaintReviewAction,
  CreateComplaintPayload,
  RetailComplaint,
} from '@/types/retail-complaints';

const BASE = '/planika/maloprodaja/complaints';

export const retailComplaintsService = {
  getCapabilities(): Promise<ComplaintCapabilities> {
    return apiService.get(`${BASE}/capabilities`);
  },

  list(params?: { status?: string; store_id?: number; search?: string }): Promise<RetailComplaint[]> {
    return apiService.get(BASE, params);
  },

  get(id: number): Promise<RetailComplaint> {
    return apiService.get(`${BASE}/${id}`);
  },

  create(data: CreateComplaintPayload): Promise<RetailComplaint> {
    return apiService.post(BASE, data);
  },

  update(id: number, data: CreateComplaintPayload): Promise<RetailComplaint> {
    return apiService.put(`${BASE}/${id}`, data);
  },

  uploadPhoto(
    id: number,
    slot: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<RetailComplaint> {
    const formData = new FormData();
    formData.append('photo', file);
    return apiService.upload(`${BASE}/${id}/photos/${slot}`, formData, onProgress);
  },

  review(
    id: number,
    data: {
      action: ComplaintReviewAction;
      admin_comment?: string;
      admin_response?: string;
    }
  ): Promise<RetailComplaint> {
    return apiService.post(`${BASE}/${id}/review`, data);
  },
};
