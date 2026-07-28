export interface EmployeeList {
  id: number;
  company_id: number;
  file_path: string;
  file_name: string;
  file_type: 'image' | 'pdf';
  mime_type?: string | null;
  file_size?: number | null;
  title?: string | null;
  uploaded_by?: number | null;
  created_at?: string;
  updated_at?: string;
  download_url?: string;
}

export interface ContractCompany {
  id: number;
  name: string;
  code: string;
  city?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  employee_lists?: EmployeeList[];
  employee_lists_count?: number;
}

export interface ContractCompaniesResponse {
  data: ContractCompany[];
  total: number;
  cities: string[];
}

export interface ContractCompanyFormData {
  name: string;
  code: string;
  city?: string;
  notes?: string;
}

export interface ContractCompaniesImportResult {
  message: string;
  success_count: number;
  updated_count: number;
  error_count: number;
  errors: Array<{ row_number: number; error: string }>;
}
