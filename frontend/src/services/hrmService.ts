import { apiService } from './api';
import type {
  HREmployee,
  HRDepartment,
  HRContract,
  HRContractType,
  HROnboardingProcess,
  HROnboardingTask,
  HROnboardingTemplate,
  HREmployeeDocument,
  HRDocumentType,
  HRDecision,
  HRDecisionType,
  HREvaluation,
  HREvaluationTemplate,
  HROffboardingProcess,
  HROffboardingTask,
  HROffboardingReason,
  HRLeave,
  HRLeaveType,
  HRLeaveBalance,
  HRTimeEntry,
  HRTimelineEntry,
  HRAlert,
  HRDashboardStats,
  EmployeeFilters,
  LeaveFilters,
  TimeEntryFilters,
  HRStore,
  HRWorkPosition,
} from '../types/hrm';
import type { PaginatedResponse } from '../types';

// ============================================
// DASHBOARD
// ============================================
export const getHRDashboard = () => 
  apiService.get<{ stats: HRDashboardStats; recent_activities: HRTimelineEntry[]; alerts: HRAlert[] }>('/hrm/dashboard');

// ============================================
// EMPLOYEES
// ============================================
export const getEmployees = (filters?: EmployeeFilters) =>
  apiService.get<PaginatedResponse<HREmployee>>('/hrm/employees', filters);

export const getEmployee = (id: number) =>
  apiService.get<HREmployee>(`/hrm/employees/${id}`);

export const createEmployee = (data: Partial<HREmployee>) =>
  apiService.post<HREmployee>('/hrm/employees', data);

export const importEmployees = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiService.upload<{ success: boolean; message: string; imported: number; errors: number; error_details: any[] }>('/hrm/employees/import', formData);
};

export const updateEmployee = (id: number, data: Partial<HREmployee>) =>
  apiService.put<HREmployee>(`/hrm/employees/${id}`, data);

export const deleteEmployee = (id: number) =>
  apiService.delete(`/hrm/employees/${id}`);

export const updateEmployeeStatus = (id: number, status: string, notes?: string) =>
  apiService.put(`/hrm/employees/${id}/status`, { status, notes });

export const getEmployeeTimeline = (id: number) =>
  apiService.get<HRTimelineEntry[]>(`/hrm/employees/${id}/timeline`);

export const getEmployeeLeaveBalance = (id: number, year?: number) =>
  apiService.get<HRLeaveBalance[]>(`/hrm/employees/${id}/leave-balance`, { year });

// ============================================
// DEPARTMENTS
// ============================================
export const getDepartments = () =>
  apiService.get<HRDepartment[]>('/hrm/departments');

export const getDepartment = (id: number) =>
  apiService.get<HRDepartment>(`/hrm/departments/${id}`);

export const getDepartmentTree = () =>
  apiService.get<HRDepartment[]>('/hrm/departments/tree');

export const createDepartment = (data: Partial<HRDepartment>) =>
  apiService.post<HRDepartment>('/hrm/departments', data);

export const updateDepartment = (id: number, data: Partial<HRDepartment>) =>
  apiService.put<HRDepartment>(`/hrm/departments/${id}`, data);

export const deleteDepartment = (id: number) =>
  apiService.delete(`/hrm/departments/${id}`);

// ============================================
// CONTRACTS
// ============================================
export const getContracts = (filters?: { employee_id?: number; status?: string }) =>
  apiService.get<PaginatedResponse<HRContract>>('/hrm/contracts', filters);

export const getContractTypes = () =>
  apiService.get<HRContractType[]>('/hrm/contracts/types');

export const createContract = (data: Partial<HRContract>) =>
  apiService.post<HRContract>('/hrm/contracts', data);

// ============================================
// ONBOARDING
// ============================================
export const getOnboardingProcesses = (filters?: { status?: string }) =>
  apiService.get<PaginatedResponse<HROnboardingProcess>>('/hrm/onboarding', filters);

export const getOnboardingTemplates = () =>
  apiService.get<HROnboardingTemplate[]>('/hrm/onboarding/templates');

export const startOnboarding = (employeeId: number, templateId: number, startDate?: string) =>
  apiService.post<HROnboardingProcess>('/hrm/onboarding', {
    employee_id: employeeId,
    template_id: templateId,
    ...(startDate && { start_date: startDate }),
  });

export const getOnboardingProcess = (processId: number) =>
  apiService.get<HROnboardingProcess>(`/hrm/onboarding/${processId}`);

export const getOnboardingTasks = (processId: number) =>
  apiService.get<HROnboardingTask[]>(`/hrm/onboarding/${processId}/tasks`);

export const updateOnboardingTask = (processId: number, taskId: number, data: Partial<HROnboardingTask>) =>
  apiService.put<HROnboardingTask[]>(`/hrm/onboarding/${processId}/tasks/${taskId}`, data);

export const updateOnboardingProcessStatus = (processId: number, status: HROnboardingProcess['status']) =>
  apiService.put<HROnboardingProcess>(`/hrm/onboarding/${processId}/status`, { status });

// ============================================
// DOCUMENTS
// ============================================
export const getDocumentTypes = () =>
  apiService.get<HRDocumentType[]>('/hrm/documents/types');

export const getEmployeeDocuments = (employeeId: number) =>
  apiService.get<HREmployeeDocument[]>(`/hrm/employees/${employeeId}/documents`);

export const uploadEmployeeDocument = (employeeId: number, formData: FormData) =>
  apiService.upload<HREmployeeDocument>(`/hrm/employees/${employeeId}/documents`, formData);

export const downloadEmployeeDocument = (employeeId: number, documentId: number, filename: string) =>
  apiService.download(`/hrm/employees/${employeeId}/documents/${documentId}/download`, filename);

// ============================================
// DECISIONS
// ============================================
export const getDecisions = (filters?: { employee_id?: number; status?: string }) =>
  apiService.get<PaginatedResponse<HRDecision>>('/hrm/decisions', filters);

export const getDecisionTypes = () =>
  apiService.get<HRDecisionType[]>('/hrm/decisions/types');

export const createDecision = (data: Partial<HRDecision>) =>
  apiService.post<HRDecision>('/hrm/decisions', data);

export const approveDecision = (id: number, approved: boolean, notes?: string) =>
  apiService.put(`/hrm/decisions/${id}/approve`, { approved, notes });

// ============================================
// EVALUATIONS
// ============================================
export const getEvaluations = (filters?: { employee_id?: number; status?: string; type?: string }) =>
  apiService.get<PaginatedResponse<HREvaluation>>('/hrm/evaluations', filters);

export const getEvaluationTemplates = () =>
  apiService.get<HREvaluationTemplate[]>('/hrm/evaluations/templates');

export const createEvaluation = (data: Partial<HREvaluation>) =>
  apiService.post<HREvaluation>('/hrm/evaluations', data);

export const submitEvaluation = (id: number, data: { scores: Record<number, number>; decision?: string; comments?: string }) =>
  apiService.put(`/hrm/evaluations/${id}/submit`, data);

// ============================================
// OFFBOARDING
// ============================================
export const getOffboardingProcesses = (filters?: { status?: string }) =>
  apiService.get<PaginatedResponse<HROffboardingProcess>>('/hrm/offboarding', filters);

export const getOffboardingReasons = () =>
  apiService.get<HROffboardingReason[]>('/hrm/offboarding/reasons');

export const initiateOffboarding = (employeeId: number, reasonId: number, lastWorkingDate: string, notes?: string) =>
  apiService.post<HROffboardingProcess>('/hrm/offboarding', { 
    employee_id: employeeId, 
    reason_id: reasonId, 
    last_working_date: lastWorkingDate,
    notes 
  });

export const getOffboardingTasks = (processId: number) =>
  apiService.get<HROffboardingTask[]>(`/hrm/offboarding/${processId}/tasks`);

export const updateOffboardingTask = (processId: number, taskId: number, data: Partial<HROffboardingTask>) =>
  apiService.put(`/hrm/offboarding/${processId}/tasks/${taskId}`, data);

export const completeOffboarding = (processId: number) =>
  apiService.put(`/hrm/offboarding/${processId}/complete`);

// ============================================
// LEAVES
// ============================================
export const getLeaveTypes = () =>
  apiService.get<HRLeaveType[]>('/hrm/leaves/types');

export const getLeaves = (filters?: LeaveFilters) =>
  apiService.get<PaginatedResponse<HRLeave>>('/hrm/leaves', filters);

export const requestLeave = (data: Partial<HRLeave>) =>
  apiService.post<HRLeave>('/hrm/leaves', data);

export const updateLeaveStatus = (id: number, status: 'approved' | 'rejected', reason?: string) =>
  apiService.put(`/hrm/leaves/${id}/status`, { status, rejection_reason: reason });

// ============================================
// TIME ENTRIES / ATTENDANCE
// ============================================
export const getTimeEntries = (filters?: TimeEntryFilters) =>
  apiService.get<PaginatedResponse<HRTimeEntry>>('/hrm/time-entries', filters);

export const clockInOut = (action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') =>
  apiService.post<HRTimeEntry>('/hrm/time-entries/clock', { action });

// ============================================
// REPORTS
// ============================================
export const getReports = (type: string, params?: Record<string, unknown>) =>
  apiService.get(`/hrm/reports/${type}`, params);

// ============================================
// ALERTS
// ============================================
export const getAlerts = (status?: string) =>
  apiService.get<HRAlert[]>('/hrm/alerts', status ? { status } : undefined);

export const acknowledgeAlert = (id: number) =>
  apiService.put(`/hrm/alerts/${id}/acknowledge`);

export const resolveAlert = (id: number) =>
  apiService.put(`/hrm/alerts/${id}/resolve`);

// ============================================
// STORES
// ============================================
export const getStores = (filters?: { department_id?: number; is_active?: boolean; search?: string }) =>
  apiService.get<HRStore[]>('/hrm/stores', filters);

export const createStore = (data: Partial<HRStore>) =>
  apiService.post<HRStore>('/hrm/stores', data);

export const updateStore = (id: number, data: Partial<HRStore>) =>
  apiService.put<HRStore>(`/hrm/stores/${id}`, data);

export const deleteStore = (id: number) =>
  apiService.delete(`/hrm/stores/${id}`);

// ============================================
// WORK POSITIONS
// ============================================
export const getWorkPositions = (filters?: { department_id?: number; store_id?: number; is_active?: boolean; search?: string }) =>
  apiService.get<HRWorkPosition[]>('/hrm/work-positions', filters);

export const createWorkPosition = (data: Partial<HRWorkPosition>) =>
  apiService.post<HRWorkPosition>('/hrm/work-positions', data);

export const updateWorkPosition = (id: number, data: Partial<HRWorkPosition>) =>
  apiService.put<HRWorkPosition>(`/hrm/work-positions/${id}`, data);

export const deleteWorkPosition = (id: number) =>
  apiService.delete(`/hrm/work-positions/${id}`);
