import { apiService } from './api';
import type { PaginatedResponse } from '../types';

// Types
export type ControlPlanType = 'inventory_required' | 'inventory_extraordinary' | 'store_visit';
export type ControlPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

export interface ControlPlan {
  id: number;
  type: ControlPlanType;
  title: string;
  description?: string;
  year: number;
  regional_manager_id?: number;
  regional_manager_name?: string;
  status: ControlPlanStatus;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  total_stores: number;
  completed_stores: number;
  notes?: string;
  items_count?: number;
  completed_items_count?: number;
  created_at: string;
  updated_at: string;
  items?: ControlPlanItem[];
}

export interface ControlPlanItem {
  id: number;
  plan_id: number;
  store_id: number;
  store_name?: string;
  store_code?: string;
  planned_date: string;
  completed_date?: string;
  status: PlanItemStatus;
  assigned_to?: number;
  assigned_to_name?: string;
  notes?: string;
  findings?: string;
  priority: number; // 0 = normal, 1 = high, 2 = critical
  created_at: string;
  updated_at: string;
}

export interface ControlPlanFilters {
  type?: ControlPlanType | 'all';
  status?: ControlPlanStatus | 'all';
  year?: number;
  regional_manager_id?: number;
  search?: string;
  per_page?: number;
}

export interface PlanItemFilters {
  status?: PlanItemStatus | 'all';
  store_id?: number;
}

// ============================================
// OVERVIEW STATISTICS
// ============================================
export interface RetailOverviewStats {
  active_plans: number;
  controls_this_month: number;
  education_this_month: number;
  evaluations_this_month: number;
  total_plans: number;
  pending_items: number;
  completed_items: number;
}

export const getRetailOverviewStats = () =>
  apiService.get<RetailOverviewStats>('/retail/overview-stats');

// ============================================
// REPORTS
// ============================================
export interface RetailReportItem {
  id: number;
  type: 'plan' | 'activity' | 'education';
  title: string;
  description?: string;
  date: string | null;
  end_date?: string | null;
  deadline?: string | null;
  completed_date?: string | null;
  status: string;
  plan_type?: string;
  education_type?: string;
  regional_manager?: string;
  year?: number;
  plan_title?: string;
  store_name?: string;
  store_code?: string;
  assigned_to?: string;
  employee_name?: string;
  employee_email?: string;
  instructor_name?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  priority?: number;
  plan_id?: number;
}

export interface RetailReportsResponse {
  reports: RetailReportItem[];
  start_date: string;
  end_date: string;
  total: number;
}

export const getRetailReports = (filters?: { start_date?: string; end_date?: string; type?: 'all' | 'plans' | 'activities' }) =>
  apiService.get<RetailReportsResponse>('/retail/reports', filters);

// ============================================
// CONTROL PLANS
// ============================================
export const getControlPlans = (filters?: ControlPlanFilters) =>
  apiService.get<PaginatedResponse<ControlPlan>>('/retail/control-plans', filters);

export const getControlPlan = (id: number) =>
  apiService.get<ControlPlan>(`/retail/control-plans/${id}`);

export const createControlPlan = (data: Partial<ControlPlan>) =>
  apiService.post<ControlPlan>('/retail/control-plans', data);

export const updateControlPlan = (id: number, data: Partial<ControlPlan>) =>
  apiService.put<ControlPlan>(`/retail/control-plans/${id}`, data);

export const deleteControlPlan = (id: number) =>
  apiService.delete(`/retail/control-plans/${id}`);

// ============================================
// PLAN ITEMS
// ============================================
export const getPlanItems = (planId: number, filters?: PlanItemFilters) =>
  apiService.get<ControlPlanItem[]>(`/retail/control-plans/${planId}/items`, filters);

export const createPlanItem = (planId: number, data: Partial<ControlPlanItem>) =>
  apiService.post<ControlPlanItem>(`/retail/control-plans/${planId}/items`, data);

export const updatePlanItem = (planId: number, itemId: number, data: Partial<ControlPlanItem>) =>
  apiService.put<ControlPlanItem>(`/retail/control-plans/${planId}/items/${itemId}`, data);

export const deletePlanItem = (planId: number, itemId: number) =>
  apiService.delete(`/retail/control-plans/${planId}/items/${itemId}`);

