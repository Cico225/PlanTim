import { apiService } from './api';
import type { PaginatedResponse } from '../types';

// Types
export type EducationType = 'internal' | 'external' | 'online' | 'workshop';
export type EducationPlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface EducationPlan {
  id: number;
  title: string;
  description?: string;
  store_id: number;
  store_name?: string;
  store_code?: string;
  employee_id: number;
  employee_name?: string;
  employee_email?: string;
  education_date: string;
  start_time?: string;
  end_time?: string;
  education_type: EducationType;
  topic?: string;
  content?: string;
  instructor_id?: number;
  instructor_name?: string;
  location?: string;
  status: EducationPlanStatus;
  completed_date?: string;
  notes?: string;
  feedback?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface EducationPlanFilters {
  store_id?: number;
  employee_id?: number;
  status?: EducationPlanStatus | 'all';
  education_type?: EducationType | 'all';
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
}

// ============================================
// EDUCATION PLANS
// ============================================
export const getEducationPlans = (filters?: EducationPlanFilters) =>
  apiService.get<PaginatedResponse<EducationPlan>>('/retail/education-plans', filters);

export const getEducationPlan = (id: number) =>
  apiService.get<EducationPlan>(`/retail/education-plans/${id}`);

export const createEducationPlan = (data: Partial<EducationPlan>) =>
  apiService.post<EducationPlan>('/retail/education-plans', data);

export const updateEducationPlan = (id: number, data: Partial<EducationPlan>) =>
  apiService.put<EducationPlan>(`/retail/education-plans/${id}`, data);

export const deleteEducationPlan = (id: number) =>
  apiService.delete(`/retail/education-plans/${id}`);

// ============================================
// EMPLOYEES BY STORE
// ============================================
export const getEmployeesByStore = (storeId: number) =>
  apiService.get<any[]>(`/retail/education-plans/stores/${storeId}/employees`);








