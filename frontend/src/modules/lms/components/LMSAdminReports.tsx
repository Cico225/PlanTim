import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBarChart2, FiUsers, FiBook, FiCheckCircle, FiClock, 
  FiTrendingUp, FiEye, FiDownload, FiPercent, FiAward
} from 'react-icons/fi';
import { lmsService } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface AdminStats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  total_completions: number;
  total_lessons: number;
  total_quizzes: number;
  average_completion_rate: number;
  average_quiz_score: number;
}

interface CourseStats {
  id: number;
  title: string;
  enrollment_count: number;
  completion_count: number;
  avg_progress: number;
}

interface RecentEnrollment {
  user_name: string;
  course_title: string;
  enrolled_at: string;
  progress: number;
}

interface ActivityByDay {
  date: string;
  activity_count: number;
}

export default function LMSAdminReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([]);
  const [activityByDay, setActivityByDay] = useState<ActivityByDay[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getAdminReports();
      setStats(data.stats);
      setCourseStats(data.course_stats || []);
      setRecentEnrollments(data.recent_enrollments || []);
      setActivityByDay(data.activity_by_day || []);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      if (error.response?.status === 403) {
        toast.error('Nemate pristup izvještajima');
        navigate('/lms');
      } else {
        toast.error('Neuspješno učitavanje izvještaja');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Ukupno korisnika', value: stats.total_users, icon: FiUsers, color: 'bg-blue-500' },
    { label: 'Ukupno kurseva', value: stats.total_courses, icon: FiBook, color: 'bg-purple-500' },
    { label: 'Ukupno upisa', value: stats.total_enrollments, icon: FiTrendingUp, color: 'bg-green-500' },
    { label: 'Završenih kurseva', value: stats.total_completions, icon: FiCheckCircle, color: 'bg-emerald-500' },
    { label: 'Stopa završetka', value: `${stats.average_completion_rate}%`, icon: FiPercent, color: 'bg-amber-500' },
    { label: 'Prosječna ocjena kviza', value: `${stats.average_quiz_score}%`, icon: FiAward, color: 'bg-indigo-500' },
  ] : [];

  const maxActivity = Math.max(...activityByDay.map(d => d.activity_count), 1);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            <FiBarChart2 className="text-indigo-500" />
            Izvještaji
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pregled statistika i analitike sistema za učenje
          </p>
        </div>
        
        <button
          onClick={() => window.print()}
          className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <FiDownload className="w-4 h-4" />
          Izvezi
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-4">
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Performance */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiBook className="text-purple-500" />
            Performanse kurseva
          </h2>
          
          {courseStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nema dostupnih podataka o kursevima
            </div>
          ) : (
            <div className="space-y-4">
              {courseStats.map((course) => {
                const completionRate = course.enrollment_count > 0 
                  ? Math.round((course.completion_count / course.enrollment_count) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={course.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1 mr-2">
                        {course.title}
                      </h3>
                      <button
                        onClick={() => navigate(`/lms/courses/${course.id}`)}
                        className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Upisani:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {course.enrollment_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Završili:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {course.completion_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Stopa:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {completionRate}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${course.avg_progress || 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiClock className="text-green-500" />
            Nedavni upisi
          </h2>
          
          {recentEnrollments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nema nedavnih upisa
            </div>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((enrollment, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {enrollment.user_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {enrollment.course_title}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {enrollment.progress}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(enrollment.enrolled_at).toLocaleDateString('hr-HR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiTrendingUp className="text-blue-500" />
          Aktivnost korisnika (zadnjih 30 dana)
        </h2>
        
        {activityByDay.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nema dostupnih podataka o aktivnosti
          </div>
        ) : (
          <div className="h-48 overflow-x-auto">
            <div className="flex h-40 min-w-[280px] items-end justify-between gap-1">
              {activityByDay.map((day, index) => (
                <div 
                  key={day.date}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ 
                      height: `${(day.activity_count / maxActivity) * 100}%`,
                      minHeight: day.activity_count > 0 ? '4px' : '0'
                    }}
                    title={`${day.date}: ${day.activity_count} aktivnosti`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{activityByDay[0]?.date}</span>
              <span>{activityByDay[activityByDay.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="card p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <h2 className="text-xl font-semibold mb-4">Sažetak</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-indigo-100">Ukupno lekcija</p>
            <p className="text-3xl font-bold">{stats?.total_lessons || 0}</p>
          </div>
          <div>
            <p className="text-indigo-100">Ukupno kvizova</p>
            <p className="text-3xl font-bold">{stats?.total_quizzes || 0}</p>
          </div>
          <div>
            <p className="text-indigo-100">Prosječna stopa završetka</p>
            <p className="text-3xl font-bold">{stats?.average_completion_rate || 0}%</p>
          </div>
          <div>
            <p className="text-indigo-100">Prosječna ocjena kviza</p>
            <p className="text-3xl font-bold">{stats?.average_quiz_score || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}






