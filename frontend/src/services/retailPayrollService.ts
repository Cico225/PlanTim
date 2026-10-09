import { apiService } from './api';

export interface SalaryCategory {
  id: number;
  position_type: 'seller' | 'manager';
  category: string;
  label: string;
  base_salary: number | string;
}

export interface PayrollPeriod {
  year: number;
  month: number;
  label: string;
}

export interface PayrollImportInfo {
  id: number;
  file_name: string | null;
  year: number;
  months: string | null;
  rows_count: number;
  uploaded_by_name?: string | null;
  created_at: string;
}

export interface PayrollMeta {
  can_manage: boolean;
  categories: SalaryCategory[];
  my_periods: PayrollPeriod[];
  periods: PayrollPeriod[];
  last_import: PayrollImportInfo | null;
}

export interface PayrollStoreBreakdown {
  row_id: number;
  store_name: string;
  position: string | null;
  position_type: 'seller' | 'manager';
  category: string | null;
  category_label: string | null;
  category_salary: number;
  working_days: number;
  share: number;
  share_basis: 'days' | 'turnover' | 'equal';
  base_salary: number;
  turnover_worker_ly: number;
  net_salary_worker_ly: number;
  turnover_worker_cy: number;
  plan_worker_cy: number;
  kp: number;
  kp_source: 'worker' | 'store' | 'none';
  turnover_salary: number;
  turnover_difference: number;
  salary: number;
  plan_store: number;
  turnover_store_cy: number;
  turnover_store_ly: number;
  plan_met: boolean;
  plan_achievement: number | null;
  stimulation_base: number;
  worker_share: number;
  stimulation: number;
  total: number;
  transport: number;
}

export interface PayrollTotals {
  base_salary: number;
  turnover_salary: number;
  turnover_difference: number;
  salary: number;
  stimulation: number;
  total: number;
  transport: number;
  total_with_transport: number;
  turnover_worker_cy: number;
  turnover_worker_ly: number;
  working_days: number;
}

export interface PayrollWorkerResult {
  worker_key: string;
  worker_name: string;
  user_id: number | null;
  user_name: string | null;
  year: number;
  month: number;
  month_label: string;
  stores_count: number;
  stores: PayrollStoreBreakdown[];
  totals: PayrollTotals;
  warnings: string[];
}

export interface PayrollSummary {
  data: PayrollWorkerResult[];
  totals: Pick<PayrollTotals, 'base_salary' | 'turnover_difference' | 'salary' | 'stimulation' | 'total' | 'transport' | 'total_with_transport'>;
  workers_count: number;
  unlinked_count: number;
}

export interface PayrollImportError {
  row?: number;
  sheet?: string;
  worker?: string;
  level?: 'warning';
  message: string;
}

export interface PayrollUploadResult {
  message: string;
  import_id: number;
  year: number;
  months: { month: number; label: string }[];
  rows_count: number;
  workers_count: number;
  stores_count: number;
  new_workers: number;
  auto_linked: number;
  unlinked_count: number;
  errors: PayrollImportError[];
}

export interface PayrollWorkerLink {
  id: number;
  worker_key: string;
  worker_name: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  rows_count: number;
  stores: string;
}

export interface PayrollUserOption {
  id: number;
  name: string;
  email: string;
}

const BASE = '/retail/payroll';

export const retailPayrollService = {
  getMeta: () => apiService.get<PayrollMeta>(`${BASE}/meta`),
  getMy: (params?: { year?: number; month?: number }) =>
    apiService.get<{ data: PayrollWorkerResult[] }>(`${BASE}/my`, params),
  getSummary: (year: number, month: number) => apiService.get<PayrollSummary>(`${BASE}/summary`, { year, month }),
  upload: (file: File, year: number, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('year', String(year));
    return apiService.upload<PayrollUploadResult>(`${BASE}/upload`, fd, onProgress);
  },
  deletePeriod: (year: number, month: number) => apiService.post(`${BASE}/delete-period`, { year, month }),
  updateCategories: (categories: { id: number; base_salary: number; label?: string }[]) =>
    apiService.put<{ message: string; categories: SalaryCategory[] }>(`${BASE}/categories`, { categories }),
  getWorkerLinks: () => apiService.get<{ data: PayrollWorkerLink[] }>(`${BASE}/worker-links`),
  updateWorkerLink: (id: number, userId: number | null) =>
    apiService.put(`${BASE}/worker-links/${id}`, { user_id: userId }),
  searchUsers: (search: string) => apiService.get<{ data: PayrollUserOption[] }>(`${BASE}/users`, { search }),
};
