// ============================================
// HRM EMPLOYEE STATUS & TYPES
// ============================================
export type EmployeeStatus = 'candidate' | 'hiring' | 'active' | 'on_hold' | 'offboarding' | 'former';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type ContractType = 'indefinite' | 'fixed_term' | 'intern' | 'temporary';

// ============================================
// HRM EMPLOYEE
// ============================================
export interface HREmployee {
  id: number;
  user_id: number;
  name: string;
  email: string;
  employee_number: string;
  personal_id_number?: string;
  department_id?: number;
  department_name?: string;
  position: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date: string;
  probation_end_date?: string;
  termination_date?: string;
  salary?: number;
  currency: string;
  manager_id?: number;
  manager_name?: string;
  mentor_id?: number;
  mentor_name?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// HRM DEPARTMENT
// ============================================
export interface HRDepartment {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  parent_department_id?: number;
  parent_department_name?: string;
  parent_name?: string;
  manager_id?: number;
  manager_name?: string;
  employees_count?: number;
  employee_count?: number;
  division_type?: 'direkcija' | 'maloprodaja';
  is_active?: boolean;
  sort_order?: number;
  children?: HRDepartment[];
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// EMPLOYMENT CONTRACTS
// ============================================
export type LegalEntity = 'fbih' | 'rs' | 'bd';
export type JobRole = 'store_manager' | 'deputy_manager' | 'salesperson';
export type ContractDocumentKind = 'full_contract' | 'annex';
export type EmploymentContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'superseded';

export interface EmploymentContractTemplate {
  id: number;
  code: string;
  name: string;
  legal_entity: LegalEntity;
  job_role: JobRole;
  document_kind: ContractDocumentKind;
  template_file: string;
  output_format: 'docx' | 'pdf';
  is_active: boolean;
}

export interface EmploymentContract {
  id: number;
  employee_id: number;
  employee_user_name?: string;
  store_id?: number;
  store_label?: string;
  template_id: number;
  template_name?: string;
  parent_contract_id?: number;
  contract_number?: string;
  protocol_number?: string;
  legal_entity: LegalEntity;
  job_role: JobRole;
  document_kind: ContractDocumentKind;
  annex_number?: number;
  status: EmploymentContractStatus;
  employment_term: 'indefinite' | 'fixed';
  contract_sign_date?: string;
  work_start_date?: string;
  work_end_date?: string;
  effective_date?: string;
  expiry_date?: string;
  auto_renew: boolean;
  renewal_notice_days?: number;
  salary_gross?: number;
  salary_net?: number;
  currency: string;
  position_title?: string;
  store_name?: string;
  store_city?: string;
  employee_full_name?: string;
  employee_origin?: string;
  employee_address?: string;
  employee_education?: string;
  custom_fields?: Record<string, unknown>;
  generated_document_path?: string;
  output_format?: 'docx' | 'pdf';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmploymentContractFilters {
  search?: string;
  store_id?: number;
  legal_entity?: LegalEntity;
  job_role?: JobRole;
  status?: EmploymentContractStatus | string;
  employee_id?: number;
  template_id?: number;
  expiring_within_days?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface EmploymentContractSettings {
  default_renewal_notice_days: number;
  auto_create_renewal_draft: boolean;
}

export interface EmploymentContractSummary {
  total: number;
  active: number;
  expiring_soon: number;
  draft: number;
  by_entity: Array<{ legal_entity: LegalEntity; total: number }>;
}

// Legacy contract types (older API surface)
export interface HRContract {
  id: number;
  employee_id: number;
  employee_name?: string;
  contract_type_id: number;
  contract_type_name?: string;
  contract_number: string;
  start_date: string;
  end_date?: string;
  salary: number;
  currency: string;
  position: string;
  department_id?: number;
  department_name?: string;
  work_hours_per_week: number;
  probation_months?: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  notes?: string;
  document_path?: string;
  created_at: string;
  updated_at: string;
}

export interface HRContractType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_indefinite: boolean;
  default_duration_months?: number;
  is_active: boolean;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// HRM ONBOARDING
// ============================================
export interface HROnboardingProcess {
  id: number;
  employee_id: number;
  employee_name?: string;
  template_id: number;
  template_name?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string;
  target_completion_date?: string;
  completed_date?: string;
  progress_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HROnboardingTask {
  id: number;
  process_id: number;
  name: string;
  description?: string;
  category: string;
  responsible_id?: number;
  responsible_name?: string;
  due_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  sort_order: number;
  notes?: string;
}

export interface HROnboardingTemplate {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  tasks: HROnboardingTemplateTask[];
}

export interface HROnboardingTemplateTask {
  id: number;
  template_id: number;
  name: string;
  description?: string;
  category: string;
  default_responsible_role?: string;
  days_from_start: number;
  is_required: boolean;
  sort_order: number;
}

// ============================================
// HRM DOCUMENTS
// ============================================
export interface HREmployeeDocument {
  id: number;
  employee_id: number;
  document_type_id: number;
  document_type_name?: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  version: number;
  valid_from?: string;
  valid_until?: string;
  is_signed: boolean;
  signed_at?: string;
  uploaded_by_id: number;
  uploaded_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRDocumentType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_required: boolean;
  requires_signature: boolean;
  requires_expiry: boolean;
  is_active: boolean;
}

// ============================================
// HRM DECISIONS
// ============================================
export interface HRDecision {
  id: number;
  employee_id: number;
  employee_name?: string;
  decision_type_id: number;
  decision_type_name?: string;
  decision_number: string;
  title: string;
  content: string;
  effective_date: string;
  expiry_date?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executed';
  created_by_id: number;
  created_by_name?: string;
  approved_by_id?: number;
  approved_by_name?: string;
  approved_at?: string;
  document_path?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRDecisionType {
  id: number;
  name: string;
  code: string;
  description?: string;
  requires_approval: boolean;
  template?: string;
  is_active: boolean;
}

// ============================================
// HRM EVALUATIONS
// ============================================
export interface HREvaluation {
  id: number;
  employee_id: number;
  employee_name?: string;
  template_id: number;
  template_name?: string;
  evaluator_id: number;
  evaluator_name?: string;
  evaluation_type: 'probation' | 'annual' | 'project' | 'go_nogo';
  period_start: string;
  period_end: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'reviewed' | 'completed';
  overall_score?: number;
  decision?: 'go' | 'no_go' | 'extend' | 'pending';
  strengths?: string;
  improvements?: string;
  goals?: string;
  comments?: string;
  employee_comments?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HREvaluationTemplate {
  id: number;
  name: string;
  description?: string;
  evaluation_type: string;
  criteria: HREvaluationCriteria[];
  is_active: boolean;
}

export interface HREvaluationCriteria {
  id: number;
  template_id: number;
  name: string;
  description?: string;
  weight: number;
  max_score: number;
  sort_order: number;
}

// ============================================
// HRM OFFBOARDING
// ============================================
export interface HROffboardingProcess {
  id: number;
  employee_id: number;
  employee_name?: string;
  reason_id: number;
  reason_name?: string;
  reason_type: 'resignation' | 'termination' | 'contract_expiry' | 'mutual_agreement' | 'retirement';
  initiated_date: string;
  last_working_date: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  notes?: string;
  exit_interview_date?: string;
  exit_interview_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HROffboardingTask {
  id: number;
  process_id: number;
  name: string;
  description?: string;
  category: string;
  responsible_id?: number;
  responsible_name?: string;
  due_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  sort_order: number;
  notes?: string;
}

export interface HROffboardingReason {
  id: number;
  name: string;
  code: string;
  reason_type: string;
  description?: string;
  is_active: boolean;
}

// ============================================
// HRM LEAVES
// ============================================
export interface HRLeave {
  id: number;
  employee_id: number;
  employee_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  requested_by_id: number;
  approved_by_id?: number;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRLeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  default_days: number;
  carry_over_days: number;
  is_paid: boolean;
  requires_approval: boolean;
  is_active: boolean;
}

export interface HRLeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name?: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  carried_over_days: number;
}

// ============================================
// HRM ATTENDANCE / TIME ENTRIES
// ============================================
export interface HRTimeEntry {
  id: number;
  employee_id: number;
  employee_name?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  regular_hours: number;
  overtime_hours: number;
  break_duration: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_id?: number;
  approved_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HRStore {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_manager_id?: number;
  manager_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  employees_count?: number;
  created_at: string;
  updated_at: string;
}

export interface HRWorkPosition {
  id: number;
  name: string;
  code?: string;
  department_id?: number;
  department_name?: string;
  store_id?: number;
  store_name?: string;
  description?: string;
  requirements?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  min_salary?: number;
  max_salary?: number;
  max_employees?: number;
  current_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRWorkSchedule {
  id: number;
  name: string;
  code: string;
  work_days: number[];
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  is_default: boolean;
  is_active: boolean;
}

// ============================================
// HRM TIMELINE
// ============================================
export interface HRTimelineEntry {
  id: number;
  employee_id: number;
  event_type: string;
  title: string;
  description?: string;
  old_value?: string;
  new_value?: string;
  created_by_id?: number;
  created_by_name?: string;
  created_at: string;
}

// ============================================
// HRM ALERTS
// ============================================
export interface HRAlert {
  id: number;
  type: 'contract_expiry' | 'probation_end' | 'evaluation_due' | 'document_expiry' | 'leave_balance' | 'birthday' | 'anniversary';
  title: string;
  message: string;
  employee_id?: number;
  employee_name?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by_id?: number;
  acknowledged_at?: string;
  created_at: string;
}

// ============================================
// HRM DASHBOARD & REPORTS
// ============================================
export interface HRDashboardStats {
  total_employees: number;
  active_employees: number;
  on_leave_today: number;
  pending_leaves: number;
  pending_evaluations: number;
  expiring_contracts: number;
  onboarding_in_progress: number;
  offboarding_in_progress: number;
  new_hires_this_month: number;
  terminations_this_month: number;
  upcoming_birthdays: number;
  upcoming_anniversaries: number;
}

export interface HRHeadcountReport {
  total: number;
  by_department: { department: string; count: number }[];
  by_status: { status: string; count: number }[];
  by_employment_type: { type: string; count: number }[];
  trend: { month: string; count: number }[];
}

export interface HRTurnoverReport {
  period_start: string;
  period_end: string;
  new_hires: number;
  terminations: number;
  turnover_rate: number;
  by_reason: { reason: string; count: number }[];
  by_department: { department: string; hires: number; terminations: number }[];
  trend: { month: string; hires: number; terminations: number }[];
}

export interface HRLeaveReport {
  total_days_taken: number;
  by_type: { type: string; days: number }[];
  by_department: { department: string; days: number }[];
  by_month: { month: string; days: number }[];
  pending_requests: number;
}

export interface HRAttendanceReport {
  period_start: string;
  period_end: string;
  total_hours: number;
  overtime_hours: number;
  average_hours_per_day: number;
  by_employee: { employee: string; hours: number; overtime: number }[];
  by_department: { department: string; hours: number }[];
}

// ============================================
// API FILTERS
// ============================================
export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  department_id?: number;
  employment_type?: EmploymentType;
  manager_id?: number;
  page?: number;
  per_page?: number;
}

export interface LeaveFilters {
  employee_id?: number;
  status?: string;
  leave_type_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface TimeEntryFilters {
  employee_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  page?: number;
  per_page?: number;
}




