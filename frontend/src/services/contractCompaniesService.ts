import { apiService } from '@/services/api';
import type {
  ContractCompaniesImportResult,
  ContractCompaniesResponse,
  ContractCompany,
  ContractCompanyFormData,
} from '@/types/contract-companies';

export interface ContractCompaniesCapabilities {
  can_view: boolean;
  can_manage: boolean;
  can_import: boolean;
}

const BASE = '/planika/finance/contract-companies';

export const contractCompaniesService = {
  getCapabilities(): Promise<ContractCompaniesCapabilities> {
    return apiService.get(`${BASE}/capabilities`);
  },

  list(params?: { search?: string; city?: string }): Promise<ContractCompaniesResponse> {
    return apiService.get(BASE, params);
  },

  get(id: number): Promise<ContractCompany> {
    return apiService.get(`${BASE}/${id}`);
  },

  create(data: ContractCompanyFormData): Promise<ContractCompany> {
    return apiService.post(BASE, data);
  },

  update(id: number, data: ContractCompanyFormData): Promise<ContractCompany> {
    return apiService.put(`${BASE}/${id}`, data);
  },

  remove(id: number): Promise<{ message: string }> {
    return apiService.delete(`${BASE}/${id}`);
  },

  uploadExcel(file: File, onProgress?: (progress: number) => void): Promise<ContractCompaniesImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.upload(`${BASE}/upload`, formData, onProgress);
  },

  uploadEmployeeList(
    companyId: number,
    file: File,
    title?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; company: ContractCompany }> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return apiService.upload(`${BASE}/${companyId}/employee-lists`, formData, onProgress);
  },

  deleteEmployeeList(companyId: number, listId: number): Promise<{ message: string }> {
    return apiService.delete(`${BASE}/${companyId}/employee-lists/${listId}`);
  },

  employeeListUrl(companyId: number, listId: number): string {
    return `/api${BASE}/${companyId}/employee-lists/${listId}`;
  },
};
