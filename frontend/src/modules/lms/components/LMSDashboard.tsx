import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBook, FiAward, FiTrendingUp, FiTarget, FiZap, FiCheckCircle, 
  FiClock, FiStar, FiBarChart2, FiUsers
} from 'react-icons/fi';
import { lmsService, Badge } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  lessons_completed: number;
  quizzes_passed: number;
  average_score: number;
  total_points: number;
  current_streak: number;
}

interface RecentCourse {
  id: number;
  title: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
}

export default function LMSDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getDashboardStats();
      setStats(data.stats);
      setRecentCourses(data.recent_courses || []);
      setBadges(data.badges || []);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      toast.error('Neuspješno učitavanje dashboard-a');
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

  const statCards = [
    { 
      label: 'Upisani kursevi', 
      value: stats?.enrolled_courses || 0, 
      icon: FiBook, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    { 
      label: 'Završeni kursevi', 
      value: stats?.completed_courses || 0, 
      icon: FiCheckCircle, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    { 
      label: 'Završene lekcije', 
      value: stats?.lessons_completed || 0, 
      icon: FiTarget, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    { 
      label: 'Položeni kvizovi', 
      value: stats?.quizzes_passed || 0, 
      icon: FiAward, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
    { 
      label: 'Prosječna ocjena', 
      value: `${stats?.average_score || 0}%`, 
      icon: FiBarChart2, 
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    { 
      label: 'Ukupno bodova', 
      value: stats?.total_points || 0, 
      icon: FiStar, 
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    },
  ];

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      {/* Header with streak */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Moj napredak</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pregled vaših postignuća i statistika učenja
          </p>
        </div>
        
        {/* Streak badge */}
        {stats && stats.current_streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg">
            <FiZap className="w-5 h-5" />
            <span className="font-bold">{stats.current_streak} dana zaredom!</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={`${stat.bgColor} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}
          >
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
        {/* Recent Courses */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Nedavni kursevi
            </h2>
            <button 
              onClick={() => navigate('/lms/my-courses')}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Prikaži sve
            </button>
          </div>
          
          {recentCourses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiBook className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Niste upisani u nijedan kurs</p>
              <button 
                onClick={() => navigate('/lms')}
                className="btn-primary mt-4"
              >
                Pronađi kurseve
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => navigate(`/lms/courses/${course.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 max-w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {course.progress}%
                      </span>
                    </div>
                  </div>
                  {course.completed_at && (
                    <FiCheckCircle className="w-5 h-5 text-green-500 ml-3 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Osvojeni bedževi
            </h2>
            <button 
              onClick={() => navigate('/lms/badges')}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Prikaži sve
            </button>
          </div>
          
          {badges.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiAward className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Još nemate osvojenih bedževa</p>
              <p className="text-sm mt-1">Nastavite učiti da osvojite prvi bedž!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {badges.slice(0, 8).map((badge) => (
                <div 
                  key={badge.id}
                  className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:shadow-md transition-shadow"
                  title={badge.description}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl mb-2"
                    style={{ backgroundColor: badge.color }}
                  >
                    {badge.icon === 'FiStar' && <FiStar />}
                    {badge.icon === 'FiBook' && <FiBook />}
                    {badge.icon === 'FiAward' && <FiAward />}
                    {badge.icon === 'FiCheckCircle' && <FiCheckCircle />}
                    {badge.icon === 'FiFire' && <FiZap />}
                    {badge.icon === 'FiGift' && <FiStar />}
                    {!badge.icon && <FiAward />}
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white text-center">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/lms')}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-shadow"
        >
          <FiBook className="w-8 h-8 mb-2" />
          <span className="font-medium">Svi kursevi</span>
        </button>
        <button
          onClick={() => navigate('/lms/leaderboard')}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
        >
          <FiUsers className="w-8 h-8 mb-2" />
          <span className="font-medium">Ljestvica</span>
        </button>
        <button
          onClick={() => navigate('/lms/badges')}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl hover:shadow-lg transition-shadow"
        >
          <FiAward className="w-8 h-8 mb-2" />
          <span className="font-medium">Bedževi</span>
        </button>
        <button
          onClick={() => navigate('/lms/certificates')}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-shadow"
        >
          <FiCheckCircle className="w-8 h-8 mb-2" />
          <span className="font-medium">Certifikati</span>
        </button>
      </div>
    </div>
  );
}






