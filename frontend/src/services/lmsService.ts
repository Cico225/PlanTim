import { apiService } from './api';

export interface Course {
  id: number;
  title: string;
  description?: string;
  cover_image?: string;
  video_intro_url?: string;
  category?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  is_published: boolean;
  is_featured: boolean;
  instructor_id: number;
  instructor?: {
    id: number;
    name: string;
    email: string;
  };
  attachments?: string[];
  user_groups?: Array<{
    id: number;
    group_type: string;
    group_value: string;
  }>;
  lessons_count?: number;
  quizzes_count?: number;
  enrollments_count?: number;
  user_enrollment?: Enrollment;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  content?: string;
  video_url?: string;
  image_url?: string;
  duration?: number;
  order: number;
  is_published: boolean;
  additional_files?: string[];
  user_progress?: {
    completed_at: string;
    is_completed: boolean;
  };
  attachments?: Array<{
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }>;
}

export interface Quiz {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  max_attempts?: number;
  order: number;
  is_published: boolean;
  questions?: QuizQuestion[];
  questions_count?: number;
  user_attempts?: QuizAttempt[];
  latest_attempt?: QuizAttempt;
  can_retake?: boolean;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[] | Array<{ label: string; value: string }>;
  correct_answer?: string;
  points: number;
  order: number;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  user_id: number;
  attempt_number: number;
  score: number;
  percentage: number;
  grade: string;
  passed: boolean;
  recommend_retake: boolean;
  answers?: any;
  question_results?: any[];
  started_at: string;
  completed_at?: string;
}

export interface Enrollment {
  id: number;
  course_id: number;
  user_id: number;
  enrolled_at: string;
  completed_at?: string;
  progress: number;
  final_score?: number;
  grade?: string;
  recommend_retake: boolean;
  min_passing_score: number;
  course?: Course;
}

export interface Certificate {
  id: number;
  course_id: number;
  user_id: number;
  certificate_number: string;
  final_score?: number;
  grade?: string;
  issued_at: string;
  expires_at?: string;
  file_path?: string;
  course?: Course;
}

class LMSService {
  // ==================== USERS & ROLES ====================

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
    }>('/lms/users-and-roles');
  }

  // ==================== COURSES ====================
  
  async getCourses(params?: {
    category?: string;
    level?: string;
    published?: boolean;
  }) {
    return apiService.get<{
      data: Course[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    }>('/lms/courses', params);
  }

  async getCourse(id: number) {
    return apiService.get<Course>(`/lms/courses/${id}`);
  }

  async createCourse(data: Partial<Course>) {
    return apiService.post<Course>('/lms/courses', data);
  }

  async updateCourse(id: number, data: Partial<Course>) {
    return apiService.put<Course>(`/lms/courses/${id}`, data);
  }

  async deleteCourse(id: number) {
    return apiService.delete(`/lms/courses/${id}`);
  }

  async enrollInCourse(courseId: number) {
    return apiService.post<Enrollment>(`/lms/courses/${courseId}/enroll`);
  }

  async getMyEnrollments() {
    return apiService.get<Enrollment[]>('/lms/courses/my-enrollments');
  }

  async updateProgress(courseId: number, data: { progress?: number; final_score?: number; grade?: string }) {
    return apiService.put(`/lms/courses/${courseId}/progress`, data);
  }

  // ==================== LESSONS ====================

  async getLessons(courseId: number) {
    return apiService.get<Lesson[]>(`/lms/courses/${courseId}/lessons`);
  }

  async getLesson(courseId: number, lessonId: number) {
    return apiService.get<Lesson>(`/lms/courses/${courseId}/lessons/${lessonId}`);
  }

  async createLesson(courseId: number, data: Partial<Lesson>) {
    return apiService.post<Lesson>(`/lms/courses/${courseId}/lessons`, data);
  }

  async updateLesson(courseId: number, lessonId: number, data: Partial<Lesson>) {
    return apiService.put<Lesson>(`/lms/courses/${courseId}/lessons/${lessonId}`, data);
  }

  async deleteLesson(courseId: number, lessonId: number) {
    return apiService.delete(`/lms/courses/${courseId}/lessons/${lessonId}`);
  }

  async completeLesson(courseId: number, lessonId: number) {
    return apiService.post(`/lms/courses/${courseId}/lessons/${lessonId}/complete`);
  }

  // ==================== QUIZZES ====================

  async getQuizzes(courseId: number) {
    return apiService.get<Quiz[]>(`/lms/courses/${courseId}/quizzes`);
  }

  async getQuiz(courseId: number, quizId: number) {
    return apiService.get<Quiz>(`/lms/courses/${courseId}/quizzes/${quizId}`);
  }

  async createQuiz(courseId: number, data: Partial<Quiz>) {
    return apiService.post<Quiz>(`/lms/courses/${courseId}/quizzes`, data);
  }

  async updateQuiz(courseId: number, quizId: number, data: Partial<Quiz>) {
    return apiService.put<Quiz>(`/lms/courses/${courseId}/quizzes/${quizId}`, data);
  }

  async deleteQuiz(courseId: number, quizId: number) {
    return apiService.delete(`/lms/courses/${courseId}/quizzes/${quizId}`);
  }

  async submitQuiz(courseId: number, quizId: number, answers: Array<{ question_id: number; answer: string }>, startedAt?: string) {
    return apiService.post<{
      attempt: QuizAttempt;
      message: string;
    }>(`/lms/courses/${courseId}/quizzes/${quizId}/submit`, {
      answers,
      started_at: startedAt,
    });
  }

  async getQuizAttempts(courseId: number, quizId: number) {
    return apiService.get<QuizAttempt[]>(`/lms/courses/${courseId}/quizzes/${quizId}/attempts`);
  }

  // ==================== CERTIFICATES ====================

  async getCertificates() {
    return apiService.get<Certificate[]>('/lms/certificates');
  }

  async getAvailableCertificates() {
    return apiService.get<Array<Certificate & { is_earned: boolean; progress: number; is_completed: boolean }>>('/lms/certificates/available');
  }

  async checkAndGenerateCertificate(courseId: number) {
    return apiService.post<{ message: string; certificate_id?: number; eligible: boolean; already_earned?: boolean }>(`/lms/certificates/check/${courseId}`);
  }

  async getCertificate(certificateId: number) {
    return apiService.get<Certificate>(`/lms/certificates/${certificateId}`);
  }

  async downloadCertificatePdf(certificateId: number): Promise<void> {
    try {
      // Use fetch API directly for blob download (more reliable for PDFs)
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lms/certificates/${certificateId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Failed to download PDF' };
        }
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/pdf')) {
        // If it's JSON error, parse it
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || errorData.error || 'Invalid PDF response');
        } catch {
          throw new Error('Server returned non-PDF content');
        }
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
      link.setAttribute('download', `certifikat-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading certificate PDF:', error);
      throw error;
    }
  }

  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    return apiService.get<{
      stats: {
        enrolled_courses: number;
        completed_courses: number;
        lessons_completed: number;
        quizzes_passed: number;
        average_score: number;
        total_points: number;
        current_streak: number;
      };
      recent_courses: Array<{
        id: number;
        title: string;
        progress: number;
        enrolled_at: string;
        completed_at?: string;
      }>;
      badges: Badge[];
    }>('/lms/dashboard');
  }

  // ==================== SEARCH ====================

  async search(query: string, type: 'all' | 'courses' | 'lessons' | 'quizzes' = 'all') {
    return apiService.get<{
      results: {
        courses: Array<{ id: number; title: string; description?: string; type: string }>;
        lessons: Array<{ id: number; title: string; course_id: number; course_title: string; type: string }>;
        quizzes: Array<{ id: number; title: string; course_id: number; course_title: string; type: string }>;
      };
      total: number;
      query: string;
    }>('/lms/search', { q: query, type });
  }

  // ==================== GAMIFICATION ====================

  async getLeaderboard(period: 'all' | 'week' | 'month' = 'all', limit = 10) {
    return apiService.get<{
      leaderboard: Array<{
        id: number;
        name: string;
        total_points: number;
        rank: number;
      }>;
      current_user_rank?: number;
      period: string;
    }>('/lms/leaderboard', { period, limit });
  }

  async getBadges() {
    return apiService.get<{
      badges: Badge[];
    }>('/lms/badges');
  }

  async adminListBadges() {
    return apiService.get<{ badges: Badge[] }>('/lms/admin/badges');
  }

  async createBadge(data: Partial<Badge>) {
    return apiService.post<Badge>('/lms/admin/badges', data);
  }

  async updateBadge(badgeId: number, data: Partial<Badge>) {
    return apiService.put<Badge>(`/lms/admin/badges/${badgeId}`, data);
  }

  async deleteBadge(badgeId: number) {
    return apiService.delete(`/lms/admin/badges/${badgeId}`);
  }

  async adminListCertificates() {
    return apiService.get<{
      certificates: Array<
        Certificate & {
          course_title?: string;
          user_name?: string;
          user_email?: string;
        }
      >;
    }>('/lms/admin/certificates');
  }

  async adminIssueCertificate(data: {
    course_id: number;
    user_id: number;
    final_score?: number;
    grade?: string;
  }) {
    return apiService.post<{
      message: string;
      certificate: Certificate;
      already_earned?: boolean;
    }>('/lms/admin/certificates', data);
  }

  async adminDeleteCertificate(certificateId: number) {
    return apiService.delete(`/lms/admin/certificates/${certificateId}`);
  }

  async getPointsHistory(limit = 20) {
    return apiService.get<{
      history: Array<{
        id: number;
        points: number;
        type: string;
        source: string;
        description?: string;
        created_at: string;
      }>;
      total: number;
    }>('/lms/points-history', { limit });
  }

  // ==================== VIDEO PROGRESS ====================

  async getVideoProgress(courseId: number, lessonId: number) {
    return apiService.get<{
      last_position: number;
      watched_seconds: number;
      percentage: number;
      is_completed: boolean;
    }>(`/lms/courses/${courseId}/lessons/${lessonId}/video-progress`);
  }

  async updateVideoProgress(courseId: number, lessonId: number, data: {
    watched_seconds: number;
    total_seconds?: number;
    last_position?: number;
  }) {
    return apiService.post<{
      message: string;
      percentage: number;
      is_completed: boolean;
    }>(`/lms/courses/${courseId}/lessons/${lessonId}/video-progress`, data);
  }

  // ==================== ADMIN REPORTS ====================

  async getAdminReports() {
    return apiService.get<{
      stats: {
        total_users: number;
        total_courses: number;
        total_enrollments: number;
        total_completions: number;
        total_lessons: number;
        total_quizzes: number;
        average_completion_rate: number;
        average_quiz_score: number;
      };
      course_stats: Array<{
        id: number;
        title: string;
        enrollment_count: number;
        completion_count: number;
        avg_progress: number;
      }>;
      recent_enrollments: Array<{
        user_name: string;
        course_title: string;
        enrolled_at: string;
        progress: number;
      }>;
      activity_by_day: Array<{
        date: string;
        activity_count: number;
      }>;
    }>('/lms/reports');
  }

  async getUserReport(userId: number) {
    return apiService.get<{
      user: {
        id: number;
        name: string;
        email: string;
        lms_total_points: number;
      };
      enrollments: Array<{
        id: number;
        title: string;
        progress: number;
        final_score?: number;
        grade?: string;
        enrolled_at: string;
        completed_at?: string;
      }>;
      quiz_attempts: Array<{
        title: string;
        score: number;
        percentage: number;
        passed: boolean;
        created_at: string;
      }>;
      badges: Badge[];
    }>(`/lms/reports/user/${userId}`);
  }

  // ==================== SURPRISES ====================

  async getCourseSurprises(courseId: number) {
    return apiService.get<{
      settings: CourseSurpriseSettings | null;
      rewards: SurpriseReward[];
    }>(`/lms/courses/${courseId}/surprises`);
  }

  async updateCourseSurprises(courseId: number, data: Partial<CourseSurpriseSettings>) {
    return apiService.put<{
      message: string;
      settings: CourseSurpriseSettings;
    }>(`/lms/courses/${courseId}/surprises`, data);
  }

  async saveSurpriseReward(courseId: number, data: Partial<SurpriseReward>) {
    return apiService.post<{
      message: string;
      reward: SurpriseReward;
    }>(`/lms/courses/${courseId}/surprises/rewards`, data);
  }

  async deleteSurpriseReward(courseId: number, rewardId: number) {
    return apiService.delete(`/lms/courses/${courseId}/surprises/rewards/${rewardId}`);
  }

  async checkSurpriseAvailability(courseId: number, quizId: number) {
    return apiService.get<{
      available: boolean;
      scratch_card: boolean;
      spin_wheel: boolean;
    }>(`/lms/courses/${courseId}/quizzes/${quizId}/surprises/check`);
  }

  async playSurprise(courseId: number, data: {
    surprise_type: 'scratch_card' | 'spin_wheel';
    quiz_id?: number;
  }) {
    return apiService.post<{
      message: string;
      attempt: UserSurpriseAttempt;
      reward: SurpriseReward;
    }>(`/lms/courses/${courseId}/surprises/play`, data);
  }

  async getUserSurpriseAttempts(courseId: number) {
    return apiService.get<{
      attempts: UserSurpriseAttempt[];
    }>(`/lms/courses/${courseId}/surprises/attempts`);
  }
}

export interface Badge {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  type: string;
  requirement_value?: number | null;
  points_reward: number;
  is_active?: boolean;
  is_earned?: boolean;
  earned_at?: string;
}

export interface CourseSurpriseSettings {
  id?: number;
  course_id: number;
  scratch_card_enabled: boolean;
  scratch_card_after_quiz: boolean;
  scratch_card_cooldown_hours: number;
  spin_wheel_enabled: boolean;
  spin_wheel_after_quiz: boolean;
  spin_wheel_cooldown_hours: number;
  spin_wheel_segments?: number;
}

export interface SurpriseReward {
  id?: number;
  course_id: number;
  type: 'scratch_card' | 'spin_wheel';
  reward_type: 'bonus_points' | 'extra_luck' | 'second_chance' | 'nice_gift' | 'wish_success' | 'motivational_message';
  title: string;
  description?: string;
  message?: string;
  points_value?: number;
  probability: number;
  order: number;
  is_active: boolean;
}

export interface UserSurpriseAttempt {
  id: number;
  course_id: number;
  user_id: number;
  quiz_id?: number;
  surprise_type: 'scratch_card' | 'spin_wheel';
  reward_id?: number;
  status: 'pending' | 'completed' | 'claimed';
  metadata?: any;
  completed_at?: string;
  reward?: SurpriseReward;
}

export const lmsService = new LMSService();




