import { apiService } from './api';

export interface ControlRecord {
  id?: number;
  store_id: number;
  plan_item_id?: number;
  store_code?: string;
  store_location?: string;
  control_type: 'total_inventory' | 'inspection';
  control_date_from: string;
  control_date_to?: string;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'finalized' | 'locked';
  
  // Inventory fields
  total_book_value?: number;
  total_counted_value?: number;
  total_difference?: number;
  inventory_status?: 'no_difference' | 'shortage' | 'surplus' | 'combined';
  deviation_reasons?: string[];
  deviation_reason_other?: string;
  inventory_conclusion?: string;
  corrective_measures_proposed?: boolean;
  
  // Inspection fields
  store_rating?: '1' | '2' | '3' | '4' | '5' | 'A' | 'B' | 'C' | 'D' | 'E';
  store_rating_comment?: string;
  positive_observations?: string;
  negative_observations?: string;
  
  // Related data
  participants?: ControlParticipant[];
  present_persons?: PresentPerson[];
  inventory_items?: InventoryItem[];
  observations?: ControlObservation[];
  measures?: ControlMeasure[];
  attachments?: Attachment[];
  signatures?: Signature[];
  
  // Computed fields
  store_name?: string;
  store_location_full?: string;
}

export interface ControlParticipant {
  id?: number;
  control_record_id?: number;
  user_id?: number;
  name: string;
  function: string;
  user_name?: string;
  user_email?: string;
}

export interface PresentPerson {
  id?: number;
  control_record_id?: number;
  employee_id?: number;
  name: string;
  function: string;
  employee_name?: string;
}

export interface InventoryItem {
  id?: number;
  control_record_id?: number;
  article_name: string;
  article_code?: string;
  book_value: number;
  counted_value: number;
  difference: number;
  difference_value: number;
  notes?: string;
  unit_price?: number; // For frontend calculation
}

export interface ControlObservation {
  id?: number;
  control_record_id?: number;
  category: string;
  item: string;
  status?: 'ok' | 'not_ok' | 'n_a';
  note?: string;
}

export interface ControlMeasure {
  id?: number;
  control_record_id?: number;
  measure: string;
  responsible_user_id?: number;
  responsible_name?: string;
  responsible_user_name?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Attachment {
  id?: number;
  control_record_id?: number;
  file_path: string;
  file_name: string;
  file_type: 'image' | 'pdf' | 'excel' | 'other';
  mime_type: string;
  file_size: number;
  notes?: string;
  file_url?: string;
}

export interface Signature {
  id?: number;
  control_record_id?: number;
  user_id: number;
  signature_type: 'controller' | 'store_manager';
  signature_hash?: string;
  signed_at?: string;
  ip_address?: string;
  user_name?: string;
}

// Service functions
export const getControlRecords = (filters?: {
  store_id?: number;
  control_type?: 'total_inventory' | 'inspection' | 'all';
  status?: 'draft' | 'finalized' | 'locked' | 'all';
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
}) =>
  apiService.get<{ data: ControlRecord[]; total: number; per_page: number; current_page: number }>(
    '/retail/control-records',
    filters
  );

export const getControlRecord = (id: number) =>
  apiService.get<ControlRecord>(`/retail/control-records/${id}`);

export const createControlRecord = (data: Partial<ControlRecord>) =>
  apiService.post<ControlRecord>('/retail/control-records', data);

export const updateControlRecord = (id: number, data: Partial<ControlRecord>) =>
  apiService.put<ControlRecord>(`/retail/control-records/${id}`, data);

export const deleteControlRecord = (id: number) =>
  apiService.delete(`/retail/control-records/${id}`);

export const uploadAttachment = (id: number, file: File, notes?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (notes) {
    formData.append('notes', notes);
  }
  // Use upload method which handles FormData properly
  return apiService.upload<Attachment>(`/retail/control-records/${id}/attachments`, formData);
};

export const deleteAttachment = (id: number, attachmentId: number) =>
  apiService.delete(`/retail/control-records/${id}/attachments/${attachmentId}`);

export const signControlRecord = (id: number, signatureType: 'controller' | 'store_manager') =>
  apiService.post<Signature>(`/retail/control-records/${id}/sign`, { signature_type: signatureType });

export const finalizeControlRecord = (id: number) =>
  apiService.post(`/retail/control-records/${id}/finalize`);

export const lockControlRecord = (id: number) =>
  apiService.post(`/retail/control-records/${id}/lock`);

export const downloadControlRecordPdf = async (id: number): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.location.origin}/api/retail/control-records/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to download PDF';
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If not JSON, use the text directly if it's not empty
          if (text && text.trim()) {
            errorMessage = text;
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
      } catch (e) {
        // If we can't read response, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      // Create error object similar to axios errors
      const error: any = new Error(errorMessage);
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: { error: errorMessage }
      };
      throw error;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      // If it's not a PDF, it might be an error response
      const text = await response.text();
      let errorMessage = 'Invalid PDF response';
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Not JSON, use the text
        if (text) {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    
    // Check blob size
    if (blob.size === 0) {
      console.error('PDF blob is empty');
      throw new Error('PDF is empty');
    }
    
    console.log('PDF blob size:', blob.size, 'bytes');
    
    // Create blob URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `evidencija-kontrole-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

