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
    data: {
      registrar_number: string;
      notes?: string;
      scan?: File;
      scan_page?: number;
    }
  ): Promise<{ message: string; credit: FinanceCredit }> {
    if (data.scan) {
      const fd = new FormData();
      fd.append('registrar_number', data.registrar_number);
      if (data.notes) fd.append('notes', data.notes);
      fd.append('scan', data.scan);
      if (data.scan_page != null) fd.append('scan_page', String(data.scan_page));
      return apiService.upload(`/planika/finance/krediti/${id}/verify-zabrana`, fd);
    }
    return apiService.post(`/planika/finance/krediti/${id}/verify-zabrana`, {
      registrar_number: data.registrar_number,
      notes: data.notes,
    });
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

  async openZabranaScan(id: number): Promise<void> {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/planika/finance/krediti/${id}/zabrana-scan`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf,image/*',
      },
    });

    if (!response.ok) {
      let message = 'Sken zabrane nije dostupan';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Sken zabrane je prazan');
    }

    const url = window.URL.createObjectURL(blob);
    const opened = window.open(url, '_blank');
    if (!opened) {
      window.URL.revokeObjectURL(url);
      throw new Error('Nije moguće otvoriti PDF. Dozvolite pop-up prozore.');
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  },
};
