import { apiService } from './api';
import type {
  FinanceCredit,
  KreditiBulkDeleteResult,
  KreditiBulkUnpairResult,
  KreditiBulkVerifyResult,
  KreditiLookupResult,
  KreditiReport,
  KreditiSelection,
  KreditiUploadResult,
  PaginatedKrediti,
} from '@/types/planika-finance';

export const kreditiService = {
  list(params?: {
    search?: string;
    year?: number;
    month?: number;
    paired?: '0' | '1';
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedKrediti> {
    return apiService.get<PaginatedKrediti>('/planika/finance/krediti', params);
  },

  lookup(number: string): Promise<KreditiLookupResult> {
    return apiService.get<KreditiLookupResult>('/planika/finance/krediti/lookup', { number });
  },

  get(id: number): Promise<FinanceCredit> {
    return apiService.get<FinanceCredit>(`/planika/finance/krediti/${id}`);
  },

  upload(
    file: File,
    year: number,
    month: number,
    overwrite: boolean,
    onProgress?: (p: number) => void
  ): Promise<KreditiUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('year', String(year));
    fd.append('month', String(month));
    fd.append('overwrite', overwrite ? '1' : '0');
    return apiService.upload<KreditiUploadResult>('/planika/finance/krediti/upload', fd, onProgress);
  },

  verifyZabrana(
    id: number,
    data: { registrar_number: string; notes?: string }
  ): Promise<{ message: string; credit: FinanceCredit }> {
    return apiService.post(`/planika/finance/krediti/${id}/verify-zabrana`, data);
  },

  unpairZabrana(id: number): Promise<{ message: string; credit: FinanceCredit }> {
    return apiService.post(`/planika/finance/krediti/${id}/unpair-zabrana`);
  },

  selection(params?: {
    search?: string;
    year?: number;
    month?: number;
    paired?: '0' | '1';
    only_unpaired?: boolean;
    only_paired?: boolean;
  }): Promise<KreditiSelection> {
    return apiService.get<KreditiSelection>('/planika/finance/krediti/selection', params);
  },

  bulkVerifyZabrana(data: {
    credit_ids?: number[];
    select_all_filtered?: boolean;
    registrar_number: string;
    notes?: string;
    year?: number;
    month?: number;
    search?: string;
    paired?: '0' | '1';
  }): Promise<KreditiBulkVerifyResult> {
    return apiService.post('/planika/finance/krediti/bulk-verify-zabrana', data);
  },

  bulkUnpairZabrana(data: {
    credit_ids?: number[];
    select_all_filtered?: boolean;
    year?: number;
    month?: number;
    search?: string;
    paired?: '0' | '1';
  }): Promise<KreditiBulkUnpairResult> {
    return apiService.post('/planika/finance/krediti/bulk-unpair-zabrana', data);
  },

  delete(id: number): Promise<{ message: string; credit_number: string; deleted_amount: number; currency: string }> {
    return apiService.delete(`/planika/finance/krediti/${id}`);
  },

  bulkDelete(data: { credit_ids: number[] }): Promise<KreditiBulkDeleteResult> {
    return apiService.post('/planika/finance/krediti/bulk-delete', data);
  },

  report(params?: { year?: number; month?: number }): Promise<KreditiReport> {
    return apiService.get<KreditiReport>('/planika/finance/krediti/report', params);
  },

  exportZabrane(params?: {
    year?: number;
    month?: number;
    search?: string;
    paired?: '0' | '1';
    date_from?: string;
    date_to?: string;
  }): Promise<void> {
    const year = params?.year ?? new Date().getFullYear();
    const month = params?.month;
    const filename = month
      ? `zabrane_${year}_${String(month).padStart(2, '0')}.xlsx`
      : `zabrane_${year}.xlsx`;
    return apiService.download('/planika/finance/krediti/export-zabrane', filename, params);
  },
};
