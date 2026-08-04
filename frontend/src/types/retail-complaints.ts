export type ComplaintStatus = 'zaprimljena' | 'odobrena' | 'odbijena';

export type ComplaintReviewAction = 'odobrena' | 'odbijena';

export interface RetailComplaint {
  id: number;
  complaint_number: string;
  store_id: number;
  store_name?: string;
  created_by: number;
  created_by_name?: string;
  customer_name: string;
  customer_address?: string | null;
  customer_phone?: string | null;
  customer_city?: string | null;
  customer_email?: string | null;
  article_code?: string | null;
  article_price?: number | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  purchase_date?: string | null;
  defect_description?: string | null;
  status: ComplaintStatus;
  submitted_at?: string | null;
  admin_comment?: string | null;
  admin_response?: string | null;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  photo_1_path?: string | null;
  photo_1_url?: string | null;
  photo_2_path?: string | null;
  photo_2_url?: string | null;
  photo_3_path?: string | null;
  photo_3_url?: string | null;
  photo_4_path?: string | null;
  photo_4_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintCapabilities {
  can_create: boolean;
  can_review: boolean;
  can_view_all: boolean;
  store_id: number | null;
  requires_store_selection?: boolean;
  stores?: Array<{ id: number; name: string }>;
}

export interface CreateComplaintPayload {
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  customer_city?: string;
  customer_email?: string;
  article_code?: string;
  article_price?: number | string;
  payment_method?: string;
  receipt_number?: string;
  purchase_date?: string;
  defect_description?: string;
  store_id?: number;
  finalize?: boolean;
}

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  zaprimljena: 'Zaprimljena',
  odobrena: 'Odobrena',
  odbijena: 'Odbijena',
};

export const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  zaprimljena: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  odobrena: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  odbijena: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const PAYMENT_METHODS = [
  { value: 'gotovina', label: 'Gotovina' },
  { value: 'kartica', label: 'Kartica' },
  { value: 'kredit', label: 'Kredit' },
  { value: 'ostalo', label: 'Ostalo' },
] as const;

export function isComplaintSubmitted(complaint: Pick<RetailComplaint, 'submitted_at' | 'status'>): boolean {
  return Boolean(complaint.submitted_at) || complaint.status === 'odobrena' || complaint.status === 'odbijena';
}

export function canEditComplaintPhotos(complaint: Pick<RetailComplaint, 'status' | 'submitted_at'>): boolean {
  return complaint.status === 'zaprimljena' && !complaint.submitted_at;
}
