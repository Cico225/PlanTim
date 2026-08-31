// ============================================
// USER & AUTH TYPES
// ============================================
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  role: string;
  roles?: string[];
  permissions: string[];
  department?: string;
  position?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in?: number;
}

export interface LoginVerificationResponse {
  requires_verification: true;
  verification_token: string;
  masked_email: string;
  expires_in: number;
  message: string;
}

export type LoginResponse = AuthResponse | LoginVerificationResponse;

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
  recaptcha_token?: string;
}

export interface VerifyLoginCredentials {
  verification_token: string;
  code: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// ============================================
// THEME TYPES
// ============================================
export type ThemeMode = 'light' | 'dark' | 'black';

// ============================================
// LANGUAGE TYPES
// ============================================
export type Language = 'bs' | 'en';

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ============================================
// DASHBOARD TYPES
// ============================================
export interface DashboardStats {
  tasks_total: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
  projects_active: number;
  unread_notifications: number;
  recent_activities: Activity[];
}

export interface Activity {
  id: number;
  type: string;
  description: string;
  user: User;
  created_at: string;
}

// ============================================
// CRM TYPES
// ============================================
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_id?: number;
  company?: Company;
  position?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  industry?: string;
  contacts?: Contact[];
  deals?: Deal[];
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  company_id: number;
  company?: Company;
  contact_id?: number;
  contact?: Contact;
  owner_id: number;
  owner?: User;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMActivity {
  id: number;
  type: 'call' | 'meeting' | 'email' | 'note';
  subject: string;
  description?: string;
  contact_id?: number;
  company_id?: number;
  deal_id?: number;
  user_id: number;
  due_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROJECT MANAGEMENT TYPES
// ============================================
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  progress: number;
  budget?: number;
  owner_id: number;
  owner?: User;
  members?: User[];
  tasks?: Task[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  project_id: number;
  parent_task_id?: number;
  subtasks?: Task[];
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_id?: number;
  assigned_to?: User;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// DMS TYPES
// ============================================
export interface Document {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  folder_id?: number;
  folder?: Folder;
  version: number;
  versions?: DocumentVersion[];
  uploaded_by_id: number;
  uploaded_by?: User;
  tags?: string[];
  permissions?: DocumentPermission[];
  share_links?: ShareLink[];
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  name: string;
  parent_folder_id?: number;
  path: string;
  documents?: Document[];
  subfolders?: Folder[];
  permissions?: FolderPermission[];
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version: number;
  path: string;
  size: number;
  uploaded_by_id: number;
  uploaded_by?: User;
  changes_description?: string;
  created_at: string;
}

export interface DocumentPermission {
  id: number;
  document_id: number;
  user_id?: number;
  role_id?: number;
  permission: 'view' | 'edit' | 'delete';
}

export interface FolderPermission {
  id: number;
  folder_id: number;
  user_id?: number;
  role_id?: number;
  permission: 'view' | 'edit' | 'delete';
}

export interface ShareLink {
  id: number;
  document_id: number;
  token: string;
  expires_at?: string;
  password?: string;
  max_downloads?: number;
  downloads_count: number;
  created_at: string;
}

// ============================================
// LMS TYPES
// ============================================
export interface Course {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  instructor_id: number;
  instructor?: User;
  category?: string;
  duration_hours?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
  is_published: boolean;
  lessons?: Lesson[];
  enrollments?: CourseEnrollment[];
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  type: 'video' | 'document' | 'text' | 'quiz';
  content?: string;
  video_url?: string;
  document_url?: string;
  duration_minutes?: number;
  order: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: number;
  course_id: number;
  user_id: number;
  progress: number;
  completed: boolean;
  completed_at?: string;
  certificate_url?: string;
  enrolled_at: string;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  questions?: QuizQuestion[];
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correct_answer: string;
  points: number;
  order: number;
}

// ============================================
// HRM TYPES
// ============================================
export interface Employee {
  id: number;
  user_id: number;
  user?: User;
  employee_id: string;
  department_id?: number;
  department?: Department;
  position: string;
  hire_date: string;
  salary?: number;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  status: 'active' | 'on-leave' | 'terminated';
  manager_id?: number;
  manager?: Employee;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  manager?: Employee;
  employees?: Employee[];
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approved_by_id?: number;
  approved_by?: User;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  employee_id: number;
  employee?: Employee;
  date: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: number;
  break_duration?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview {
  id: number;
  employee_id: number;
  employee?: Employee;
  reviewer_id: number;
  reviewer?: User;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  comments?: string;
  status: 'draft' | 'submitted' | 'completed';
  created_at: string;
  updated_at: string;
}

// ============================================
// CHAT TYPES
// ============================================
export interface ChatMessage {
  id: number;
  conversation_id: number;
  user_id: number;
  user?: User;
  message: string;
  type: 'text' | 'file' | 'image' | 'system';
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  type: 'private' | 'group' | 'project';
  name?: string;
  participants: User[];
  last_message?: ChatMessage;
  unread_count: number;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================
export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// RBAC TYPES
// ============================================
export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  module: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// GDPR TYPES
// ============================================
export interface ConsentRecord {
  id: number;
  user_id: number;
  consent_type: string;
  consent_text: string;
  is_given: boolean;
  given_at?: string;
  withdrawn_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DataExportRequest {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  requested_at: string;
  completed_at?: string;
}

export interface DataDeletionRequest {
  id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason?: string;
  requested_at: string;
  processed_at?: string;
  processed_by_id?: number;
}

// ============================================
// AI TYPES
// ============================================
export interface AIChat {
  id: number;
  user_id: number;
  messages: AIChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AIDocumentGeneration {
  id: number;
  user_id: number;
  template_type: string;
  input_data: Record<string, any>;
  generated_content: string;
  created_at: string;
}


