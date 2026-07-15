import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import {
  FiCheckSquare,
  FiClock,
  FiBriefcase,
  FiTrendingUp,
  FiActivity,
  FiUsers,
  FiBell,
  FiCalendar,
  FiArrowRight,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  projects: {
    active: number;
    total: number;
  };
  notifications: {
    unread: number;
  };
  messages: {
    unread: number;
  };
  users?: {
    total: number;
    active_today: number;
  } | null;
}

interface Activity {
  id: string;
  type: string;
  user_name: string;
  user_email?: string;
  action: string;
  target?: string;
  created_at: string;
  time_ago: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  time_ago: string;
}

interface UpcomingTask {
  id: number;
  title: string;
  project_name?: string;
  assigned_to?: string;
  status: string;
  priority: string;
  due_date: string;
  due_date_formatted: string;
  is_overdue: boolean;
  is_today: boolean;
}

interface WeeklyStat {
  date: string;
  day: string;
  tasks_completed: number;
  activities: number;
}

interface DashboardData {
  is_admin: boolean;
  stats: DashboardStats;
  recent_activities: Activity[];
  recent_notifications: Notification[];
  upcoming_tasks: UpcomingTask[];
  weekly_stats: WeeklyStat[];
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiService.get<DashboardData>('/dashboard');
      setData(response);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error(t('dashboard.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'normal': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'low': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = data?.stats || {
    tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
    projects: { active: 0, total: 0 },
    notifications: { unread: 0 },
    messages: { unread: 0 },
  };

  const isAdmin = data?.is_admin || false;

  const statCards = [
    {
      name: t('dashboard.tasks'),
      value: stats.tasks.total,
      subtext: `${stats.tasks.completed} ${t('dashboard.completed')}`,
      icon: FiCheckSquare,
      color: 'bg-blue-500',
      link: '/projects',
    },
    {
      name: t('dashboard.projects'),
      value: stats.projects.active,
      subtext: `${stats.projects.total} ${t('dashboard.total')}`,
      icon: FiBriefcase,
      color: 'bg-green-500',
      link: '/projects',
    },
    {
      name: t('dashboard.pending'),
      value: stats.tasks.pending,
      subtext: stats.tasks.overdue > 0 ? `${stats.tasks.overdue} ${t('dashboard.overdue')}` : t('dashboard.onTrack'),
      subtextColor: stats.tasks.overdue > 0 ? 'text-red-600' : 'text-green-600',
      icon: FiClock,
      color: 'bg-yellow-500',
      link: '/projects',
    },
    {
      name: t('dashboard.notifications'),
      value: stats.notifications.unread,
      subtext: `${stats.messages.unread} ${t('dashboard.unreadMessages')}`,
      icon: FiBell,
      color: 'bg-red-500',
      link: '/notifications',
    },
  ];

  // Add admin-specific stat
  if (isAdmin && stats.users) {
    statCards.push({
      name: t('dashboard.users'),
      value: stats.users.total,
      subtext: `${stats.users.active_today} ${t('dashboard.activeToday')}`,
      icon: FiUsers,
      color: 'bg-purple-500',
      link: '/admin/users',
    });
  }

  const maxActivityValue = Math.max(
    ...((data?.weekly_stats || []).map(s => Math.max(s.tasks_completed, s.activities))),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome')}, {user?.name?.split(' ')[0] || t('dashboard.user')}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin ? t('dashboard.adminOverview') : t('dashboard.overviewDesc')}
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 self-start"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('dashboard.refresh')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className="card p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(stat.link)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    {stat.name}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                    {stat.value}
                  </p>
                  <p className={`text-xs sm:text-sm mt-1 sm:mt-2 truncate ${stat.subtextColor || 'text-gray-500'}`}>
                    {stat.subtext}
                  </p>
                </div>
                <div className={`${stat.color} p-3 sm:p-4 rounded-lg text-white flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiActivity className="text-primary-600" />
              {t('dashboard.recentActivities')}
            </h2>
            {isAdmin && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                {t('dashboard.allUsers')}
              </span>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {(data?.recent_activities || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiActivity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noActivities')}</p>
              </div>
            ) : (
              data?.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center font-semibold flex-shrink-0 text-sm">
                    {activity.user_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-semibold">{activity.user_name}</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{activity.action}</span>
                      {activity.target && (
                        <>
                          {' '}
                          <span className="font-semibold">{activity.target}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {activity.time_ago}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiCalendar className="text-primary-600" />
                {t('dashboard.upcomingTasks')}
              </h2>
              <button 
                onClick={() => navigate('/projects')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {t('dashboard.viewAll')}
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(data?.upcoming_tasks || []).length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <FiCheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>{t('dashboard.noUpcomingTasks')}</p>
                </div>
              ) : (
                data?.upcoming_tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-md ${
                      task.is_overdue 
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' 
                        : task.is_today
                        ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => navigate(`/projects`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        {task.project_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {task.project_name}
                          </p>
                        )}
                        {isAdmin && task.assigned_to && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            → {task.assigned_to}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`text-xs ${task.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {task.due_date_formatted}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Activity Chart */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiTrendingUp className="text-primary-600" />
                {t('dashboard.weeklyActivity')}
              </h2>
            </div>

            {(data?.weekly_stats || []).length > 0 ? (
              <div className="space-y-4">
                {/* Simple bar chart */}
                <div className="flex items-end justify-between gap-2 h-32">
                  {data?.weekly_stats.map((stat, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '100px' }}>
                        {/* Tasks bar */}
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all"
                          style={{ 
                            height: `${Math.max((stat.tasks_completed / maxActivityValue) * 100, stat.tasks_completed > 0 ? 10 : 0)}%`,
                            minHeight: stat.tasks_completed > 0 ? '8px' : '0'
                          }}
                          title={`${stat.tasks_completed} ${t('dashboard.tasksCompleted')}`}
                        />
                        {/* Activities bar */}
                        <div 
                          className="w-full bg-green-500 rounded-b transition-all"
                          style={{ 
                            height: `${Math.max((stat.activities / maxActivityValue) * 100, stat.activities > 0 ? 10 : 0)}%`,
                            minHeight: stat.activities > 0 ? '8px' : '0'
                          }}
                          title={`${stat.activities} ${t('dashboard.activities')}`}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{stat.day}</span>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-gray-600 dark:text-gray-400">{t('dashboard.tasks')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-gray-600 dark:text-gray-400">{t('dashboard.activities')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center bg-gray-50 dark:bg-dark-700 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('dashboard.noWeeklyData')}
                </p>
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          {(data?.recent_notifications || []).length > 0 && (
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiBell className="text-primary-600" />
                  {t('dashboard.recentNotifications')}
                </h2>
                <button 
                  onClick={() => navigate('/notifications')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('dashboard.viewAll')}
                </button>
              </div>

              <div className="space-y-2">
                {data?.recent_notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'bg-gray-50 dark:bg-gray-700/50' 
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}
                    onClick={() => notification.action_url && navigate(notification.action_url)}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notification.time_ago}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
