import { apiService } from './api';

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  owner_id: number;
  owner_name?: string;
  progress: number;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: number;
  assigned_to_name?: string;
  parent_task_id?: number;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  position?: number;
  story_points?: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
  assignees?: Array<{
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
  }>;
  comments_count?: number;
  project_name?: string; // For "all projects" view
}

class ProjectsService {
  // ==================== PROJECTS ====================
  
  async getProjects(params?: {
    status?: string;
    search?: string;
    page?: number;
    owner_id?: number;
    date_from?: string;
    date_to?: string;
    user_ids?: number[];
    task_status?: string;
  }) {
    return apiService.get<{
      data: Project[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    }>('/projects', params);
  }

  async getProject(id: number) {
    return apiService.get<Project>(`/projects/${id}`);
  }

  async getUsersAndRoles() {
    return apiService.get<{
      users: Array<{
        id: number;
        name: string;
        email: string;
      }>;
      roles: Array<{
        id: number;
        name: string;
        display_name: string;
      }>;
    }>('/projects/users-and-roles');
  }

  async createProject(data: Partial<Project> & {
    role_ids?: number[];
    user_ids?: number[];
  }) {
    return apiService.post<Project>('/projects', data);
  }

  async updateProject(id: number, data: Partial<Project>) {
    return apiService.put<Project>(`/projects/${id}`, data);
  }

  async deleteProject(id: number) {
    return apiService.delete<{ message: string }>(`/projects/${id}`);
  }

  // ==================== TASKS ====================
  
  async getTasks(projectId: number) {
    return apiService.get<Task[]>(`/projects/${projectId}/tasks`);
  }

  async createTask(projectId: number, data: Partial<Task> & {
    assignee_ids?: number[];
  }) {
    return apiService.post<Task>(`/projects/${projectId}/tasks`, data);
  }

  // ==================== PERSONAL TASKS ====================
  
  async getPersonalTasks(params?: {
    search?: string;
    status?: string;
    priority?: string;
    date_from?: string;
    date_to?: string;
    assignee_ids?: number[];
    filter?: 'created-for-others' | 'assigned-to-me';
  }) {
    return apiService.get<Task[]>('/tasks/personal', params);
  }

  async createPersonalTask(data: Partial<Task> & {
    assignee_ids?: number[];
    is_personal?: boolean;
  }) {
    return apiService.post<Task>('/tasks/personal', data);
  }

  async updatePersonalTask(taskId: number, data: Partial<Task> & {
    assignee_ids?: number[];
    start_date?: string;
  }) {
    return apiService.put<Task>(`/tasks/personal/${taskId}`, data);
  }

  async deletePersonalTask(taskId: number) {
    return apiService.delete<{ message: string }>(`/tasks/personal/${taskId}`);
  }

  async updateTask(projectId: number, taskId: number, data: Partial<Task>) {
    return apiService.put<Task>(`/projects/${projectId}/tasks/${taskId}`, data);
  }

  async deleteTask(projectId: number, taskId: number) {
    return apiService.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}`);
  }

  // ==================== TASK ASSIGNEES ====================
  
  async getTaskAssignees(projectId: number, taskId: number) {
    return apiService.get<Array<{
      id: number;
      task_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
      assigned_by?: number;
      assigned_at: string;
    }>>(`/projects/${projectId}/tasks/${taskId}/assignees`);
  }

  async addTaskAssignees(projectId: number, taskId: number, userIds: number[]) {
    return apiService.post<{ message: string; new_assignees: number[] }>(
      `/projects/${projectId}/tasks/${taskId}/assignees`,
      { user_ids: userIds }
    );
  }

  async removeTaskAssignee(projectId: number, taskId: number, userId: number) {
    return apiService.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}/assignees/${userId}`);
  }

  // ==================== TASK COMMENTS ====================
  
  async getTaskComments(projectId: number, taskId: number) {
    return apiService.get<Array<{
      id: number;
      task_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
      comment: string;
      mentions?: number[];
      mentions_list?: Array<{
        id: number;
        user_id: number;
        mentioned_user_name: string;
        mentioned_user_email: string;
      }>;
      is_edited?: boolean;
      edited_at?: string;
      created_at: string;
      updated_at: string;
    }>>(`/projects/${projectId}/tasks/${taskId}/comments`);
  }

  async createTaskComment(projectId: number, taskId: number, comment: string) {
    return apiService.post<{
      id: number;
      task_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
      comment: string;
      created_at: string;
    }>(`/projects/${projectId}/tasks/${taskId}/comments`, { comment });
  }

  async updateTaskComment(projectId: number, taskId: number, commentId: number, comment: string) {
    return apiService.put(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, { comment });
  }

  async deleteTaskComment(projectId: number, taskId: number, commentId: number) {
    return apiService.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
  }

  // ==================== TASK DEPENDENCIES ====================
  
  async getTaskDependencies(projectId: number, taskId: number) {
    return apiService.get<Array<{
      id: number;
      task_id: number;
      depends_on_task_id: number;
      type: string;
      depends_on_task_title?: string;
      depends_on_task_status?: string;
    }>>(`/projects/${projectId}/tasks/${taskId}/dependencies`);
  }

  async addTaskDependency(
    projectId: number,
    taskId: number,
    data: { depends_on_task_id: number; type: string }
  ) {
    return apiService.post(`/projects/${projectId}/tasks/${taskId}/dependencies`, data);
  }

  async removeTaskDependency(projectId: number, taskId: number, dependencyId: number) {
    return apiService.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`);
  }

  // ==================== TASK ATTACHMENTS ====================
  
  async getTaskAttachments(projectId: number, taskId: number) {
    return apiService.get<Array<{
      id: number;
      task_id: number;
      file_name: string;
      file_path: string;
      file_size: number;
      mime_type: string;
      uploaded_by: number;
      uploaded_by_name?: string;
      created_at: string;
    }>>(`/projects/${projectId}/tasks/${taskId}/attachments`);
  }

  async uploadTaskAttachment(projectId: number, taskId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.upload(`/projects/${projectId}/tasks/${taskId}/attachments`, formData);
  }

  async deleteTaskAttachment(projectId: number, taskId: number, attachmentId: number) {
    return apiService.delete<{ message: string }>(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
  }

  async downloadTaskAttachment(projectId: number, taskId: number, attachmentId: number, fileName: string) {
    return apiService.download(
      `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`,
      fileName
    );
  }

  // ==================== TIME TRACKING ====================
  
  async startTimeTracking(projectId: number, taskId: number, notes?: string) {
    return apiService.post<{
      id: number;
      task_id: number;
      user_id: number;
      project_id: number;
      started_at: string;
      ended_at: string | null;
      duration: number | null;
      description: string | null;
      is_running: boolean;
      created_at: string;
      updated_at: string;
    }>(`/projects/${projectId}/tasks/${taskId}/time-tracking/start`, { notes });
  }

  async stopTimeTracking(projectId: number, taskId: number, notes?: string) {
    return apiService.post<{
      id: number;
      task_id: number;
      user_id: number;
      project_id: number;
      started_at: string;
      ended_at: string;
      duration: number;
      description: string | null;
      is_running: boolean;
      created_at: string;
      updated_at: string;
    }>(`/projects/${projectId}/tasks/${taskId}/time-tracking/stop`, { notes });
  }

  async getTaskTimeTracking(projectId: number, taskId: number, userId?: number) {
    return apiService.get<{
      entries: Array<{
        id: number;
        task_id: number;
        user_id: number;
        project_id: number;
        started_at: string;
        ended_at: string | null;
        duration: number | null;
        description: string | null;
        is_running: boolean;
        user_name: string;
        user_email: string;
        created_at: string;
        updated_at: string;
      }>;
      total_minutes: number;
      total_hours: number;
    }>(`/projects/${projectId}/tasks/${taskId}/time-tracking`, { user_id: userId });
  }

  async getActiveTimer() {
    return apiService.get<{
      id: number;
      task_id: number;
      user_id: number;
      project_id: number;
      started_at: string;
      ended_at: null;
      duration: null;
      description: string | null;
      is_running: boolean;
      task_title: string;
      project_name: string;
      current_duration_seconds?: number;
      current_duration_minutes?: number;
      current_duration_hours?: number;
      created_at: string;
      updated_at: string;
    } | null>('/projects/time-tracking/active');
  }

  async addManualTimeEntry(
    projectId: number,
    taskId: number,
    data: {
      duration_minutes: number;
      started_at?: string;
      description?: string;
    }
  ) {
    return apiService.post<{
      id: number;
      task_id: number;
      user_id: number;
      project_id: number;
      started_at: string;
      ended_at: string;
      duration: number;
      description: string | null;
      is_running: boolean;
      created_at: string;
      updated_at: string;
    }>(`/projects/${projectId}/tasks/${taskId}/time-tracking/manual`, data);
  }

  async deleteTimeEntry(projectId: number, taskId: number, timeEntryId: number) {
    return apiService.delete<{ message: string }>(
      `/projects/${projectId}/tasks/${taskId}/time-tracking/${timeEntryId}`
    );
  }

  // ==================== GANTT CHART ====================

  async getGanttChart(projectId: number | string) {
    return apiService.get<{
      tasks: Array<{
        id: number;
        title: string;
        description?: string;
        status: string;
        priority: string;
        start_date: string;
        end_date: string;
        due_date?: string;
        progress: number;
        assigned_to_name?: string;
        created_by_name?: string;
        subtasks?: any[];
        dependencies?: Array<{
          id: number;
          depends_on_task_id: number;
          type: string;
        }>;
        assignees?: any[];
      }>;
      project: {
        id: number;
        name: string;
        start_date?: string;
        end_date?: string;
      };
      dependencies: any;
    }>(`/projects/${projectId}/gantt`);
  }

  async updateTaskDates(
    projectId: number,
    taskId: number,
    data: {
      start_date?: string;
      end_date?: string;
      due_date?: string;
      auto_adjust_dependencies?: boolean;
    }
  ) {
    return apiService.put<{
      task: any;
      message: string;
    }>(`/projects/${projectId}/tasks/${taskId}/dates`, data);
  }

  async getMilestones(projectId: number) {
    return apiService.get<Array<{
      id: number;
      project_id: number;
      name: string;
      description?: string;
      target_date: string;
      achieved: boolean;
      created_at: string;
      updated_at: string;
    }>>(`/projects/${projectId}/milestones`);
  }

  // ==================== ACTIVITIES ====================
  
  async getProjectActivities(projectId: number, params?: {
    task_id?: number;
    entity_type?: string;
    page?: number;
    per_page?: number;
  }) {
    return apiService.get<{
      data: Array<{
        id: number;
        project_id: number;
        task_id?: number;
        entity_type: string;
        action: string;
        user_id: number;
        user_name: string;
        old_value?: any;
        new_value?: any;
        metadata?: any;
        description?: string;
        created_at: string;
      }>;
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    }>(`/projects/${projectId}/activities`, params);
  }

  async getCalendarData(params?: {
    start_date?: string;
    end_date?: string;
    project_id?: number;
    user_id?: number;
    task_id?: number;
  }) {
    return apiService.get<Array<{
      id: string;
      title: string;
      type: 'project' | 'task';
      start: string;
      end: string;
      color: string;
      project_id?: number;
      task_id?: number;
      status?: string;
      priority?: string;
      owner_name?: string;
      assigned_to_name?: string;
      assigned_to_id?: number;
      project_name?: string;
      description?: string;
    }>>('/projects/calendar/data', params);
  }
}

export const projectsService = new ProjectsService();

