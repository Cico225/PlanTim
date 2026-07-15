export interface FinanceCredit {
  id: number;
  credit_number: string;
  barcode: string | null;
  issue_date: string | null;
  store_name: string | null;
  company_name: string | null;
  customer_name: string | null;
  amount: number | null;
  currency: string;
  import_year: number | null;
  import_month: number | null;
  additional_data: Record<string, unknown> | null;
  zabrana_verified: boolean;
  zabrana_verified_at: string | null;
  zabrana_verified_by_name: string | null;
  registrar_number: string | null;
  notes: string | null;
  is_paired: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface KreditiUploadResult {
  message: string;
  success_count: number;
  error_count: number;
  errors: Array<{ row_number: number; error: string }>;
  import_year?: number;
  import_month?: number;
  errors_truncated?: boolean;
}

export interface KreditiReport {
  total: number;
  paired: number;
  unpaired: number;
  paired_percent: number;
  by_month: Array<{
    year: number;
    month: number;
    total: number;
    paired: number;
    unpaired: number;
  }>;
}

export interface KreditiLookupResult {
  found: boolean;
  message?: string;
  credit?: FinanceCredit;
}

export interface PaginatedKrediti {
  data: FinanceCredit[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface KreditiSelectionItem {
  id: number;
  credit_number: string;
  amount: number | null;
  is_paired?: boolean;
}

export interface KreditiSelection {
  count: number;
  total_amount: number;
  currency: string;
  items: KreditiSelectionItem[];
}

export interface KreditiBulkVerifyResult {
  message: string;
  paired_count: number;
  skipped_count: number;
  paired_amount: number;
  currency: string;
}

export interface KreditiBulkUnpairResult {
  message: string;
  unpaired_count: number;
  skipped_count: number;
  unpaired_amount: number;
  currency: string;
}
