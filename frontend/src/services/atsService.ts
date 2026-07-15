import { apiService } from './api';
import type { PaginatedResponse } from '../types';

export interface JobPosition {
  id: number;
  title: string;
  department_id?: number;
  department_name?: string;
  location?: string;
  employment_type?: string;
  status: 'draft' | 'open' | 'closed' | 'on_hold';
  description?: string;
  requirements?: string;
  posted_date?: string;
  closing_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position_id?: number;
  position_title?: string;
  status: 'new' | 'reviewing' | 'shortlisted' | 'interviewed' | 'offered' | 'rejected' | 'hired';
  resume_url?: string;
  cover_letter?: string;
  notes?: string;
  applied_date: string;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: number;
  candidate_id: number;
  candidate_name?: string;
  position_id: number;
  position_title?: string;
  interviewer_id?: number;
  interviewer_name?: string;
  interview_type: 'phone' | 'video' | 'in-person' | 'technical';
  scheduled_date: string;
  scheduled_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: number;
  candidate_id: number;
  candidate_name?: string;
  position_id: number;
  position_title?: string;
  salary?: number;
  start_date?: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  offer_letter_url?: string;
  sent_date?: string;
  response_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// JOB POSITIONS
// ============================================
export const getPositions = (filters?: { status?: string; search?: string }) =>
  apiService.get<PaginatedResponse<JobPosition>>('/hrm/ats/positions', filters);

export const getPosition = (id: number) =>
  apiService.get<JobPosition>(`/hrm/ats/positions/${id}`);

export const createPosition = (data: Partial<JobPosition>) =>
  apiService.post<JobPosition>('/hrm/ats/positions', data);

export const updatePosition = (id: number, data: Partial<JobPosition>) =>
  apiService.put<JobPosition>(`/hrm/ats/positions/${id}`, data);

export const deletePosition = (id: number) =>
  apiService.delete(`/hrm/ats/positions/${id}`);

// ============================================
// CANDIDATES
// ============================================
export const getCandidates = (filters?: { position_id?: number; status?: string; search?: string }) =>
  apiService.get<PaginatedResponse<Candidate>>('/hrm/ats/candidates', filters);

export const getCandidate = (id: number) =>
  apiService.get<Candidate>(`/hrm/ats/candidates/${id}`);

export const createCandidate = (data: Partial<Candidate>) =>
  apiService.post<Candidate>('/hrm/ats/candidates', data);

export const updateCandidate = (id: number, data: Partial<Candidate>) =>
  apiService.put<Candidate>(`/hrm/ats/candidates/${id}`, data);

export const deleteCandidate = (id: number) =>
  apiService.delete(`/hrm/ats/candidates/${id}`);

export const uploadResume = (candidateId: number, file: File) => {
  const formData = new FormData();
  formData.append('resume', file);
  return apiService.upload<{ resume_url: string }>(`/hrm/ats/candidates/${candidateId}/resume`, formData);
};

// ============================================
// INTERVIEWS
// ============================================
export const getInterviews = (filters?: { candidate_id?: number; position_id?: number; status?: string }) =>
  apiService.get<PaginatedResponse<Interview>>('/hrm/ats/interviews', filters);

export const getInterview = (id: number) =>
  apiService.get<Interview>(`/hrm/ats/interviews/${id}`);

export const createInterview = (data: Partial<Interview>) =>
  apiService.post<Interview>('/hrm/ats/interviews', data);

export const updateInterview = (id: number, data: Partial<Interview>) =>
  apiService.put<Interview>(`/hrm/ats/interviews/${id}`, data);

export const deleteInterview = (id: number) =>
  apiService.delete(`/hrm/ats/interviews/${id}`);

// ============================================
// OFFERS
// ============================================
export const getOffers = (filters?: { candidate_id?: number; position_id?: number; status?: string }) =>
  apiService.get<PaginatedResponse<Offer>>('/hrm/ats/offers', filters);

export const getOffer = (id: number) =>
  apiService.get<Offer>(`/hrm/ats/offers/${id}`);

export const createOffer = (data: Partial<Offer>) =>
  apiService.post<Offer>('/hrm/ats/offers', data);

export const updateOffer = (id: number, data: Partial<Offer>) =>
  apiService.put<Offer>(`/hrm/ats/offers/${id}`, data);

export const deleteOffer = (id: number) =>
  apiService.delete(`/hrm/ats/offers/${id}`);

export const sendOffer = (id: number) =>
  apiService.post(`/hrm/ats/offers/${id}/send`);

export const acceptOffer = (id: number) =>
  apiService.post(`/hrm/ats/offers/${id}/accept`);

export const rejectOffer = (id: number, reason?: string) =>
  apiService.post(`/hrm/ats/offers/${id}/reject`, { reason });

export const atsService = {
  // Positions
  getPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
  
  // Candidates
  getCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  
  // Interviews
  getInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview,
  
  // Offers
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  sendOffer,
  acceptOffer,
  rejectOffer,
};









