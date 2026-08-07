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
  EmploymentContract,
  EmploymentContractTemplate,
  EmploymentContractFilters,
  EmploymentContractSettings,
  EmploymentContractSummary,
  EducationSummary,
  EducationProgram,
  EducationEnrollment,
  EducationCertificate,
  DevelopmentPlan,
  TalentSummary,
  TalentProfile,
  CareerPath,
  SuccessionPlan,
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
// CONTRACTS (legacy endpoints)
// ============================================
export const getContracts = (filters?: { employee_id?: number; status?: string }) =>
  apiService.get<PaginatedResponse<HRContract>>('/hrm/contracts', filters);

export const getContractTypes = () =>
  apiService.get<HRContractType[]>('/hrm/contracts/types');

export const createContract = (data: Partial<HRContract>) =>
  apiService.post<HRContract>('/hrm/contracts', data);

// ============================================
// EMPLOYMENT CONTRACTS
// ============================================
export const getEmploymentContractTemplates = (includeInactive = false) =>
  apiService.get<EmploymentContractTemplate[]>('/hrm/contracts/templates', {
    include_inactive: includeInactive ? 1 : 0,
  });

export const uploadEmploymentContractTemplate = (
  formData: FormData,
  onProgress?: (progress: number) => void
) =>
  apiService.upload<{ message: string; template: EmploymentContractTemplate }>(
    '/hrm/contracts/templates',
    formData,
    onProgress
  );

export const replaceEmploymentContractTemplateFile = (
  id: number,
  formData: FormData,
  onProgress?: (progress: number) => void
) =>
  apiService.upload<{ message: string; template: EmploymentContractTemplate }>(
    `/hrm/contracts/templates/${id}/file`,
    formData,
    onProgress
  );

export const downloadEmploymentContractTemplate = (id: number, filename?: string) =>
  apiService.download(`/hrm/contracts/templates/${id}/download`, filename || `sablon-${id}`);

export const updateEmploymentContractTemplate = (
  id: number,
  data: Partial<Pick<EmploymentContractTemplate, 'name' | 'legal_entity' | 'job_role' | 'document_kind' | 'output_format' | 'is_active'>>
) =>
  apiService.put<{ message: string; template: EmploymentContractTemplate }>(
    `/hrm/contracts/templates/${id}`,
    data
  );

export const getEmploymentContractSettings = () =>
  apiService.get<EmploymentContractSettings>('/hrm/contracts/settings');

export const updateEmploymentContractSettings = (data: EmploymentContractSettings) =>
  apiService.put<EmploymentContractSettings>('/hrm/contracts/settings', data);

export const getEmploymentContractSummary = () =>
  apiService.get<EmploymentContractSummary>('/hrm/contracts/summary');

export const getEmploymentContracts = (filters?: EmploymentContractFilters) =>
  apiService.get<PaginatedResponse<EmploymentContract>>('/hrm/contracts', filters);

export const getEmploymentContract = (id: number) =>
  apiService.get<{ contract: EmploymentContract; renewals: unknown[] }>(`/hrm/contracts/${id}`);

export const createEmploymentContract = (data: Record<string, unknown>) =>
  apiService.post<EmploymentContract>('/hrm/contracts', data);

export const updateEmploymentContract = (id: number, data: Record<string, unknown>) =>
  apiService.put<EmploymentContract>(`/hrm/contracts/${id}`, data);

export const bulkUpdateEmploymentContracts = (data: {
  ids: number[];
  employment_term?: 'indefinite' | 'fixed';
  duration_months?: number;
  duration_from?: 'work_start' | 'effective' | 'today';
  status?: string;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  expiry_date?: string;
  work_end_date?: string;
  salary_gross?: number;
  salary_net?: number;
  store_id?: number;
  notes?: string;
  generate_document?: boolean;
}) =>
  apiService.post<{ message: string; updated: number; failed: Array<{ id: number; message: string }> }>(
    '/hrm/contracts/bulk-update',
    data
  );

export const renewEmploymentContract = (id: number, data: Record<string, unknown>) =>
  apiService.post<EmploymentContract>(`/hrm/contracts/${id}/renew`, data);

export const generateEmploymentContractDocument = (id: number) =>
  apiService.post<EmploymentContract>(`/hrm/contracts/${id}/generate-document`);

export const downloadEmploymentContractDocument = (id: number) =>
  apiService.download(`/hrm/contracts/${id}/download-document`, `ugovor-${id}`);

// ============================================
// EDUCATION
// ============================================
export const getEducationSummary = () =>
  apiService.get<EducationSummary>('/hrm/education/summary');

export const getEducationPrograms = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<EducationProgram>>('/hrm/education/programs', filters);

export const createEducationProgram = (data: Record<string, unknown>) =>
  apiService.post<EducationProgram>('/hrm/education/programs', data);

export const updateEducationProgram = (id: number, data: Record<string, unknown>) =>
  apiService.put<EducationProgram>(`/hrm/education/programs/${id}`, data);

export const deleteEducationProgram = (id: number) =>
  apiService.delete(`/hrm/education/programs/${id}`);

export const getEducationEnrollments = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<EducationEnrollment>>('/hrm/education/enrollments', filters);

export const createEducationEnrollment = (data: Record<string, unknown>) =>
  apiService.post<EducationEnrollment>('/hrm/education/enrollments', data);

export const updateEducationEnrollment = (id: number, data: Record<string, unknown>) =>
  apiService.put<EducationEnrollment>(`/hrm/education/enrollments/${id}`, data);

export const getEducationCertificates = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<EducationCertificate>>('/hrm/education/certificates', filters);

export const createEducationCertificate = (data: Record<string, unknown>) =>
  apiService.post<EducationCertificate>('/hrm/education/certificates', data);

export const deleteEducationCertificate = (id: number) =>
  apiService.delete(`/hrm/education/certificates/${id}`);

export const getDevelopmentPlans = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<DevelopmentPlan>>('/hrm/education/development-plans', filters);

export const createDevelopmentPlan = (data: Record<string, unknown>) =>
  apiService.post<DevelopmentPlan>('/hrm/education/development-plans', data);

export const updateDevelopmentPlan = (id: number, data: Record<string, unknown>) =>
  apiService.put<DevelopmentPlan>(`/hrm/education/development-plans/${id}`, data);

export const deleteDevelopmentPlan = (id: number) =>
  apiService.delete(`/hrm/education/development-plans/${id}`);

// ============================================
// TALENT MANAGEMENT
// ============================================
export const getTalentSummary = () =>
  apiService.get<TalentSummary>('/hrm/talent/summary');

export const getTalentProfiles = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<TalentProfile>>('/hrm/talent/profiles', filters);

export const createTalentProfile = (data: Record<string, unknown>) =>
  apiService.post<TalentProfile>('/hrm/talent/profiles', data);

export const updateTalentProfile = (id: number, data: Record<string, unknown>) =>
  apiService.put<TalentProfile>(`/hrm/talent/profiles/${id}`, data);

export const deleteTalentProfile = (id: number) =>
  apiService.delete(`/hrm/talent/profiles/${id}`);

export const getCareerPaths = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<CareerPath>>('/hrm/talent/career-paths', filters);

export const createCareerPath = (data: Record<string, unknown>) =>
  apiService.post<CareerPath>('/hrm/talent/career-paths', data);

export const updateCareerPath = (id: number, data: Record<string, unknown>) =>
  apiService.put<CareerPath>(`/hrm/talent/career-paths/${id}`, data);

export const deleteCareerPath = (id: number) =>
  apiService.delete(`/hrm/talent/career-paths/${id}`);

export const getSuccessionPlans = (filters?: Record<string, unknown>) =>
  apiService.get<PaginatedResponse<SuccessionPlan>>('/hrm/talent/succession-plans', filters);

export const createSuccessionPlan = (data: Record<string, unknown>) =>
  apiService.post<SuccessionPlan>('/hrm/talent/succession-plans', data);

export const updateSuccessionPlan = (id: number, data: Record<string, unknown>) =>
  apiService.put<SuccessionPlan>(`/hrm/talent/succession-plans/${id}`, data);

export const deleteSuccessionPlan = (id: number) =>
  apiService.delete(`/hrm/talent/succession-plans/${id}`);

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
