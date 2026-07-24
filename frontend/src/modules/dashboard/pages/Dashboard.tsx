import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  FiRefreshCw,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiDatabase,
  FiShield,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardStatCard from '../components/DashboardStatCard';
import DashboardSectionCard from '../components/DashboardSectionCard';

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

  const getActivityVisual = (action: string) => {
    const text = action.toLowerCase();
    if (text.includes('created') || text.includes('kreir') || text.includes('create') || text.includes('dodao')) {
      return { Icon: FiPlus, className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' };
    }
    if (text.includes('updated') || text.includes('ažurir') || text.includes('update') || text.includes('promijen')) {
      return { Icon: FiEdit2, className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
    }
    if (text.includes('deleted') || text.includes('obris') || text.includes('delete') || text.includes('uklon')) {
      return { Icon: FiTrash2, className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
    }
    if (text.includes('backup') || text.includes('baza')) {
      return { Icon: FiDatabase, className: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' };
    }
    if (text.includes('permission') || text.includes('dozvol') || text.includes('role') || text.includes('ulog')) {
      return { Icon: FiShield, className: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' };
    }
    return { Icon: FiActivity, className: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' };
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
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

  const statCards: Array<{
    name: string;
    slug: string;
    value: number;
    subtext: string;
    subtextColor?: string;
    icon: typeof FiCheckSquare;
    statId: 'tasks' | 'projects' | 'pending' | 'notifications' | 'users';
    accent: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
    link: string;
  }> = [
    {
      name: t('dashboard.tasks'),
      slug: 'tasks',
      value: stats.tasks.total,
      subtext: `${stats.tasks.completed} ${t('dashboard.completed')}`,
      icon: FiCheckSquare,
      statId: 'tasks',
      accent: 'blue',
      link: '/projects',
    },
    {
      name: t('dashboard.projects'),
      slug: 'projects',
      value: stats.projects.active,
      subtext: `${stats.projects.total} ${t('dashboard.total')}`,
      icon: FiBriefcase,
      statId: 'projects',
      accent: 'green',
      link: '/projects',
    },
    {
      name: t('dashboard.pending'),
      slug: 'pending',
      value: stats.tasks.pending,
      subtext:
        stats.tasks.overdue > 0
          ? `${stats.tasks.overdue} ${t('dashboard.overdue')}`
          : t('dashboard.onTrack'),
      subtextColor: stats.tasks.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      icon: FiClock,
      statId: 'pending',
      accent: 'yellow',
      link: '/projects',
    },
    {
      name: t('dashboard.notifications'),
      slug: 'notifications',
      value: stats.notifications.unread,
      subtext: `${stats.messages.unread} ${t('dashboard.unreadMessages')}`,
      icon: FiBell,
      statId: 'notifications',
      accent: 'red',
      link: '/notifications',
    },
  ];

  const firstName = user?.name?.split(' ')[0] || t('dashboard.user');

  const upcomingTasks = data?.upcoming_tasks || [];
  const recentNotifications = data?.recent_notifications || [];
  const weeklyStats = data?.weekly_stats || [];
  const weeklyTotal = weeklyStats.reduce((sum, s) => sum + s.tasks_completed + s.activities, 0);
  const nextTask = upcomingTasks[0];
  const latestNotification = recentNotifications[0];

  const secondaryCards: Array<{
    key: string;
    name: string;
    slug: string;
    value: number | string;
    subtext: string;
    subtextColor?: string;
    detail?: string;
    icon: typeof FiCheckSquare;
    statId: 'users' | 'upcoming' | 'weekly' | 'recentNotifications';
    accent: 'purple' | 'orange' | 'teal' | 'red';
    link: string;
    adminOnly?: boolean;
  }> = [
    {
      key: 'users',
      name: t('dashboard.users'),
      slug: 'users',
      value: stats.users?.total ?? 0,
      subtext: `${stats.users?.active_today ?? 0} ${t('dashboard.activeToday')}`,
      icon: FiUsers,
      statId: 'users',
      accent: 'purple',
      link: '/admin/users',
      adminOnly: true,
    },
    {
      key: 'upcoming',
      name: t('dashboard.upcomingTasks'),
      slug: 'upcoming',
      value: upcomingTasks.length,
      subtext: nextTask
        ? `${nextTask.due_date_formatted}${nextTask.is_overdue ? ' · kasni' : nextTask.is_today ? ' · danas' : ''}`
        : t('dashboard.noUpcomingTasks'),
      subtextColor: nextTask?.is_overdue ? 'text-red-600 dark:text-red-400' : undefined,
      detail: nextTask?.title,
      icon: FiCalendar,
      statId: 'upcoming',
      accent: 'orange',
      link: '/projects',
    },
    {
      key: 'weekly',
      name: t('dashboard.weeklyActivity'),
      slug: 'weekly',
      value: weeklyTotal,
      subtext: `${weeklyStats.reduce((s, d) => s + d.tasks_completed, 0)} ${t('dashboard.tasksCompleted').toLowerCase()} · ${weeklyStats.reduce((s, d) => s + d.activities, 0)} ${t('dashboard.activities').toLowerCase()}`,
      icon: FiTrendingUp,
      statId: 'weekly',
      accent: 'teal',
      link: '/activities',
    },
    {
      key: 'notifications-recent',
      name: t('dashboard.recentNotifications'),
      slug: 'alerts',
      value: stats.notifications.unread,
      subtext: latestNotification?.time_ago || 'Nema novih obavijesti',
      detail: latestNotification?.title,
      icon: FiBell,
      statId: 'recentNotifications',
      accent: 'red',
      link: '/notifications',
    },
  ];

  const visibleSecondaryCards = secondaryCards.filter((card) => !card.adminOnly || (isAdmin && stats.users));

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.welcome')}, {firstName}!
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <FiUsers size={12} />
                {t('dashboard.allUsers')}
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {isAdmin ? t('dashboard.adminOverview') : t('dashboard.overviewDesc')}
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 self-start"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('dashboard.refresh')}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => (
          <DashboardStatCard
            key={stat.name}
            name={stat.name}
            slug={stat.slug}
            value={stat.value}
            subtext={stat.subtext}
            subtextColor={stat.subtextColor}
            icon={stat.icon}
            statId={stat.statId}
            accent={stat.accent}
            delay={0.08 + index * 0.06}
            onClick={() => navigate(stat.link)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {visibleSecondaryCards.map((card, index) => (
          <DashboardStatCard
            key={card.key}
            name={card.name}
            slug={card.slug}
            value={card.value}
            subtext={card.subtext}
            subtextColor={card.subtextColor}
            detail={card.detail}
            icon={card.icon}
            statId={card.statId}
            accent={card.accent}
            delay={0.14 + index * 0.06}
            onClick={() => navigate(card.link)}
          />
        ))}
      </div>

      <DashboardSectionCard
          theme="activity"
          delay={0.2}
          title={
            <span className="flex items-center gap-2">
              <FiActivity className="text-primary-600 dark:text-primary-400" />
              {t('dashboard.recentActivities')}
            </span>
          }
          badge={
            isAdmin ? (
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {t('dashboard.allUsers')}
              </span>
            ) : undefined
          }
        >
          <div className="space-y-1 p-4 sm:p-5">
            {(data?.recent_activities || []).length === 0 ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-dark-700"
                >
                  <FiActivity className="opacity-50" size={28} />
                </motion.div>
                <p>{t('dashboard.noActivities')}</p>
              </div>
            ) : (
              data?.recent_activities.map((activity, index) => {
                const visual = getActivityVisual(activity.action);
                const ActivityIcon = visual.Icon;

                return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/60 sm:gap-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 4 }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${visual.className}`}
                  >
                    <ActivityIcon size={16} />
                  </motion.div>
                  <div className="min-w-0 flex-1">
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
                    <p className="mt-1 text-xs text-gray-500">{activity.time_ago}</p>
                  </div>
                </motion.div>
              )})
            )}
          </div>
        </DashboardSectionCard>
    </div>
  );
}
