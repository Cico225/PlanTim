// ============================================
// PLANIKA MALOPRODAJA TYPES
// ============================================

import { User } from './index';

// ============================================
// REGION
// ============================================
export interface Region {
  id: number;
  name: string;
  code: string;
  description?: string;
  regional_manager_id?: number;
  regional_manager?: User;
  department_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// STORE
// ============================================
export interface Store {
  id: number;
  name: string;
  code: string;
  region_id: number;
  region?: Region;
  store_manager_id?: number;
  store_manager?: User;
  department_id?: number;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  opening_hours?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// ACTIVITY PLAN
// ============================================
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';
export type PlanPriority = 'low' | 'normal' | 'high' | 'urgent';
export type PlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface ActivityPlan {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  period_type: PeriodType;
  target_regions?: number[];
  target_stores?: number[];
  goals?: Record<string, any>;
  required_controls_per_month: number;
  deadlines?: Record<string, any>;
  priority: PlanPriority;
  status: PlanStatus;
  created_by: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

// ============================================
// PLAN ASSIGNMENT
// ============================================
export interface PlanAssignment {
  id: number;
  plan_id: number;
  plan?: ActivityPlan;
  regional_manager_id: number;
  regional_manager?: User;
  notes?: string;
  assigned_at: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONTROL FORM
// ============================================
export type ScoringType = 'numeric' | 'yes_no' | 'scale';

export interface ControlFormSection {
  name: string;
  criteria: Array<{
    name: string;
    description?: string;
    weight?: number;
  }>;
}

export interface ControlForm {
  id: number;
  name: string;
  description?: string;
  sections: ControlFormSection[];
  scoring_type: ScoringType;
  max_score: number;
  is_active: boolean;
  created_by: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

// ============================================
// STORE CONTROL
// ============================================
export type ControlStatus = 'draft' | 'completed' | 'reviewed';

export interface ControlResponse {
  id: number;
  control_id: number;
  section_name: string;
  criterion_name: string;
  score?: number;
  response?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface StoreControl {
  id: number;
  store_id: number;
  store?: Store;
  plan_id?: number;
  plan?: ActivityPlan;
  control_form_id: number;
  control_form?: ControlForm;
  controlled_by: number;
  controller?: User;
  control_date: string;
  scores: Record<string, number>;
  total_score: number;
  percentage_score: number;
  overall_comment?: string;
  recommendations?: string[];
  corrective_measures?: string[];
  status: ControlStatus;
  responses?: ControlResponse[];
  created_at: string;
  updated_at: string;
}

// ============================================
// EVALUATION CRITERIA
// ============================================
export type EmployeeType = 'salesperson' | 'store_manager' | 'both';
export type RatingType = 'numeric' | 'scale';

export interface EvaluationCriterion {
  name: string;
  description?: string;
  weight?: number;
}

export interface EvaluationCriteria {
  id: number;
  name: string;
  employee_type: EmployeeType;
  criteria: EvaluationCriterion[];
  rating_type: RatingType;
  max_rating: number;
  is_active: boolean;
  created_by: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

// ============================================
// EMPLOYEE EVALUATION
// ============================================
export type EvaluationStatus = 'draft' | 'completed' | 'acknowledged';
export type Rating = 'odličan' | 'dobar' | 'zadovoljavajući' | 'treba poboljšanje';

export interface EvaluationResponse {
  id: number;
  evaluation_id: number;
  criterion_name: string;
  score: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeEvaluation {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    user_id: number;
    name: string;
    email: string;
    employee_number: string;
    position: string;
  };
  store_id: number;
  store?: Store;
  evaluator_id: number;
  evaluator?: User;
  evaluation_criteria_id: number;
  criteria?: EvaluationCriteria;
  evaluation_date: string;
  period_start: string;
  period_end: string;
  scores: Record<string, number>;
  average_score: number;
  rating?: Rating;
  overall_comment?: string;
  recommendations?: string[];
  status: EvaluationStatus;
  acknowledged_at?: string;
  responses?: EvaluationResponse[];
  created_at: string;
  updated_at: string;
}

// ============================================
// AUDIT LOG
// ============================================
export type AuditAction = 'created' | 'updated' | 'deleted' | 'evaluated' | 'controlled' | 'assigned' | 'acknowledged';
export type AuditEntityType = 'region' | 'store' | 'activity_plan' | 'control_form' | 'store_control' | 'evaluation_criteria' | 'employee_evaluation' | 'plan_assignment';

export interface AuditLog {
  id: number;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number;
  user_id: number;
  user?: User;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REPORTS
// ============================================
export interface OverviewReport {
  total_regions: number;
  total_stores: number;
  active_plans: number;
  completed_controls: number;
  total_evaluations: number;
  recent_controls: StoreControl[];
}

export interface RegionReport {
  region: Region;
  total_stores: number;
  controls: StoreControl[];
  evaluations: EmployeeEvaluation[];
}

export interface StoreReport {
  store: Store;
  controls: StoreControl[];
  evaluations: EmployeeEvaluation[];
}

export interface EmployeeReport {
  employee: {
    id: number;
    user_id: number;
    name: string;
    email: string;
    employee_number: string;
    position: string;
  };
  evaluations: EmployeeEvaluation[];
  average_score: number;
  total_evaluations: number;
}

// ============================================
// FORM DATA TYPES
// ============================================
export interface CreateRegionData {
  name: string;
  code: string;
  description?: string;
  regional_manager_id?: number;
}

export interface CreateStoreData {
  name: string;
  code: string;
  region_id: number;
  store_manager_id?: number;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  opening_hours?: Record<string, any>;
}

export interface CreateActivityPlanData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  period_type: PeriodType;
  target_regions?: number[];
  target_stores?: number[];
  goals?: Record<string, any>;
  required_controls_per_month?: number;
  deadlines?: Record<string, any>;
  priority?: PlanPriority;
}

export interface CreateControlFormData {
  name: string;
  description?: string;
  sections: ControlFormSection[];
  scoring_type: ScoringType;
  max_score?: number;
}

export interface CreateStoreControlData {
  store_id: number;
  plan_id?: number;
  control_form_id: number;
  control_date: string;
  scores: Record<string, number>;
  responses: Array<{
    section_name: string;
    criterion_name: string;
    score?: number;
    response?: string;
    comment?: string;
  }>;
  overall_comment?: string;
  recommendations?: string[];
  corrective_measures?: string[];
}

export interface CreateEvaluationCriteriaData {
  name: string;
  employee_type: EmployeeType;
  criteria: EvaluationCriterion[];
  rating_type: RatingType;
  max_rating?: number;
}

export interface CreateEmployeeEvaluationData {
  employee_id: number;
  store_id: number;
  evaluation_criteria_id: number;
  evaluation_date: string;
  period_start: string;
  period_end: string;
  scores: Record<string, number>;
  responses: Array<{
    criterion_name: string;
    score: number;
    comment?: string;
  }>;
  overall_comment?: string;
  recommendations?: string[];
}

