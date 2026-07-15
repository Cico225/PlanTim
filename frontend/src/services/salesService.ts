import { apiService } from './api';

export interface SalesPlan {
  id?: number;
  employee_id: number;
  year: number;
  month: number;
  gross_salary?: number;
  net_salary?: number;
  currency?: string;
  planned_shoe_pairs?: number;
  planned_merchandise_pieces?: number;
  planned_revenue?: number;
  revenue_currency?: string;
  notes?: string;
  created_by?: number;
  updated_by?: number;
  employee_name?: string;
  employee_number?: string;
  store_name?: string;
  store_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesResult {
  id?: number;
  employee_id: number;
  store_id?: number;
  year: number;
  month: number;
  result_date?: string;
  sold_shoe_pairs?: number;
  sold_merchandise_pieces?: number;
  revenue?: number;
  revenue_currency?: string;
  upload_source?: string;
  uploaded_by?: number;
  uploaded_at?: string;
  upload_file_name?: string;
  employee_name?: string;
  employee_number?: string;
  store_name?: string;
  store_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesPerformance {
  id?: number;
  employee_id: number;
  plan_id?: number;
  year: number;
  month: number;
  planned_gross_salary?: number;
  planned_net_salary?: number;
  planned_shoe_pairs?: number;
  planned_merchandise_pieces?: number;
  planned_revenue?: number;
  actual_shoe_pairs?: number;
  actual_merchandise_pieces?: number;
  actual_revenue?: number;
  shoe_pairs_percentage?: number;
  merchandise_pieces_percentage?: number;
  revenue_percentage?: number;
  bonus_eligible?: boolean;
  bonus_percentage?: number;
  employee_name?: string;
  employee_number?: string;
  store_name?: string;
  store_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesPlanFilters {
  employee_id?: number;
  year?: number;
  month?: number;
  store_id?: number;
}

export interface SalesResultFilters {
  employee_id?: number;
  year?: number;
  month?: number;
  store_id?: number;
}

export interface SalesPerformanceFilters {
  employee_id?: number;
  year?: number;
  month?: number;
  store_id?: number;
}

// Sales Plans API
export const getSalesPlans = (filters?: SalesPlanFilters) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append('employee_id', filters.employee_id.toString());
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.month) params.append('month', filters.month.toString());
  if (filters?.store_id) params.append('store_id', filters.store_id.toString());
  
  const query = params.toString();
  return apiService.get<SalesPlan[]>(`/planika/maloprodaja/sales-plans${query ? `?${query}` : ''}`);
};

export const getSalesPlan = (id: number) => {
  return apiService.get<SalesPlan>(`/planika/maloprodaja/sales-plans/${id}`);
};

export const createSalesPlan = (data: Partial<SalesPlan>) => {
  return apiService.post<SalesPlan>('/planika/maloprodaja/sales-plans', data);
};

export const updateSalesPlan = (id: number, data: Partial<SalesPlan>) => {
  return apiService.put<SalesPlan>(`/planika/maloprodaja/sales-plans/${id}`, data);
};

export const deleteSalesPlan = (id: number) => {
  return apiService.delete(`/planika/maloprodaja/sales-plans/${id}`);
};

// Sales Results API
export const getSalesResults = (filters?: SalesResultFilters) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append('employee_id', filters.employee_id.toString());
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.month) params.append('month', filters.month.toString());
  if (filters?.store_id) params.append('store_id', filters.store_id.toString());
  
  const query = params.toString();
  return apiService.get<SalesResult[]>(`/planika/maloprodaja/sales-results${query ? `?${query}` : ''}`);
};

export const uploadSalesPlans = (file: File, overwrite?: boolean) => {
  const formData = new FormData();
  formData.append('file', file);
  if (overwrite) formData.append('overwrite', '1');
  
  return apiService.upload<{
    success_count: number;
    error_count: number;
    errors: Array<{
      row_number: number;
      row: any;
      error: string;
    }>;
  }>('/planika/maloprodaja/sales-plans/upload', formData);
};

export const uploadSalesResults = (file: File, storeId?: number, overwrite?: boolean) => {
  const formData = new FormData();
  formData.append('file', file);
  if (storeId) formData.append('store_id', storeId.toString());
  if (overwrite) formData.append('overwrite', '1');
  
  return apiService.post<{
    success_count: number;
    error_count: number;
    errors: Array<{
      row_number: number;
      row: any;
      error: string;
    }>;
  }>('/planika/maloprodaja/sales-results/upload', formData);
};

// Sales Performance API
export const getSalesPerformance = (filters?: SalesPerformanceFilters) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append('employee_id', filters.employee_id.toString());
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.month) params.append('month', filters.month.toString());
  if (filters?.store_id) params.append('store_id', filters.store_id.toString());
  
  const query = params.toString();
  return apiService.get<SalesPerformance[]>(`/planika/maloprodaja/sales-performance${query ? `?${query}` : ''}`);
};






