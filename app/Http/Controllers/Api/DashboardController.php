<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Check if user is admin
     */
    private function isAdmin($user): bool
    {
        if (method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole(['admin', 'super-admin', 'Super Admin']);
            } catch (\Exception $e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Get dashboard statistics
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $this->isAdmin($user);

            // Tasks statistics
            $tasksTotal = 0;
            $tasksCompleted = 0;
            $tasksPending = 0;
            $tasksOverdue = 0;
            if (Schema::hasTable('tasks')) {
                $tasksQuery = DB::table('tasks');
                if (!$isAdmin) {
                    $tasksQuery->where('assigned_to_id', $user->id);
                }
                $tasksTotal = (clone $tasksQuery)->count();
                $tasksCompleted = (clone $tasksQuery)->where('status', 'done')->count();
                $tasksPending = (clone $tasksQuery)->whereIn('status', ['todo', 'in-progress'])->count();
                $tasksOverdue = DB::table('tasks')
                    ->when(!$isAdmin, fn($q) => $q->where('assigned_to_id', $user->id))
                    ->where('due_date', '<', now())
                    ->whereIn('status', ['todo', 'in-progress'])
                    ->count();
            }

            // Projects statistics
            $projectsActive = 0;
            $projectsTotal = 0;
            if (Schema::hasTable('projects')) {
                $projectsQuery = DB::table('projects');
                if (!$isAdmin) {
                    $projectsQuery->where(function($q) use ($user) {
                        $q->where('owner_id', $user->id);
                        // Only check project_members if the table exists
                        if (Schema::hasTable('project_members')) {
                            $q->orWhereExists(function($sub) use ($user) {
                                $sub->select(DB::raw(1))
                                    ->from('project_members')
                                    ->whereColumn('project_members.project_id', 'projects.id')
                                    ->where('project_members.user_id', $user->id);
                            });
                        }
                    });
                }
                $projectsActive = (clone $projectsQuery)->where('status', 'active')->count();
                $projectsTotal = (clone $projectsQuery)->count();
            }

            // Notifications
            $unreadNotifications = 0;
            if (Schema::hasTable('notifications')) {
                $notificationsQuery = DB::table('notifications');
                if (!$isAdmin) {
                    $notificationsQuery->where('user_id', $user->id);
                }
                $unreadNotifications = (clone $notificationsQuery)->where('is_read', false)->count();
            }

            // Inbox messages
            $unreadMessages = 0;
            if (Schema::hasTable('inbox_messages')) {
                $inboxQuery = DB::table('inbox_messages');
                if (!$isAdmin) {
                    $inboxQuery->where('recipient_id', $user->id);
                }
                $unreadMessages = (clone $inboxQuery)->where('is_read', false)->count();
            }

            // Users count (admin only)
            $usersCount = null;
            $activeUsersToday = null;
            if ($isAdmin && Schema::hasTable('users')) {
                $usersCount = DB::table('users')->count();
                if (Schema::hasColumn('users', 'last_login_at')) {
                    $activeUsersToday = DB::table('users')->whereDate('last_login_at', today())->count();
                } else {
                    $activeUsersToday = 0;
                }
            }

            // Recent activities
            $recentActivities = $this->getRecentActivities($user, $isAdmin);

            // Recent notifications for the user
            $recentNotifications = $this->getRecentNotifications($user, $isAdmin);

            // Upcoming tasks
            $upcomingTasks = $this->getUpcomingTasks($user, $isAdmin);

            // Quick stats for charts
            $weeklyStats = $this->getWeeklyStats($user, $isAdmin);

            return response()->json([
                'is_admin' => $isAdmin,
                'stats' => [
                    'tasks' => [
                        'total' => $tasksTotal,
                        'completed' => $tasksCompleted,
                        'pending' => $tasksPending,
                        'overdue' => $tasksOverdue,
                    ],
                    'projects' => [
                        'active' => $projectsActive,
                        'total' => $projectsTotal,
                    ],
                    'notifications' => [
                        'unread' => $unreadNotifications,
                    ],
                    'messages' => [
                        'unread' => $unreadMessages,
                    ],
                    'users' => $isAdmin ? [
                        'total' => $usersCount,
                        'active_today' => $activeUsersToday,
                    ] : null,
                ],
                'recent_activities' => $recentActivities,
                'recent_notifications' => $recentNotifications,
                'upcoming_tasks' => $upcomingTasks,
                'weekly_stats' => $weeklyStats,
            ]);
        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'error' => 'Failed to load dashboard',
                'is_admin' => false,
                'stats' => [
                    'tasks' => ['total' => 0, 'completed' => 0, 'pending' => 0, 'overdue' => 0],
                    'projects' => ['active' => 0, 'total' => 0],
                    'notifications' => ['unread' => 0],
                    'messages' => ['unread' => 0],
                ],
                'recent_activities' => [],
                'recent_notifications' => [],
                'upcoming_tasks' => [],
                'weekly_stats' => [],
            ]);
        }
    }

    /**
     * Get recent activities
     */
    private function getRecentActivities($user, bool $isAdmin): array
    {
        $activities = [];

        // Try activity_log table first (Spatie)
        if (Schema::hasTable('activity_log')) {
            $query = DB::table('activity_log')
                ->select('activity_log.*', 'users.name as user_name', 'users.email as user_email')
                ->leftJoin('users', 'activity_log.causer_id', '=', 'users.id');
            
            if (!$isAdmin) {
                $query->where('activity_log.causer_id', $user->id);
            }
            
            $activityLogs = $query->orderBy('activity_log.created_at', 'desc')
                ->limit(10)
                ->get();

            foreach ($activityLogs as $activity) {
                $activities[] = [
                    'id' => 'activity_' . $activity->id,
                    'type' => 'activity',
                    'user_name' => $activity->user_name ?? 'System',
                    'user_email' => $activity->user_email ?? '',
                    'action' => $activity->description ?? 'performed an action',
                    'subject_type' => $activity->subject_type,
                    'subject_id' => $activity->subject_id,
                    'created_at' => $activity->created_at,
                    'time_ago' => Carbon::parse($activity->created_at)->diffForHumans(),
                ];
            }
        }

        // Also check project_activities table
        if (Schema::hasTable('project_activities')) {
            $query = DB::table('project_activities')
                ->select(
                    'project_activities.*', 
                    'users.name as user_name', 
                    'users.email as user_email',
                    'projects.name as project_name',
                    'tasks.title as task_title'
                )
                ->leftJoin('users', 'project_activities.user_id', '=', 'users.id')
                ->leftJoin('projects', 'project_activities.project_id', '=', 'projects.id')
                ->leftJoin('tasks', 'project_activities.task_id', '=', 'tasks.id');
            
            if (!$isAdmin) {
                $query->where('project_activities.user_id', $user->id);
            }
            
            $projectActivities = $query->orderBy('project_activities.created_at', 'desc')
                ->limit(10)
                ->get();

            foreach ($projectActivities as $activity) {
                $actionText = $this->formatProjectActivityAction($activity);
                $activities[] = [
                    'id' => 'project_activity_' . $activity->id,
                    'type' => 'project_activity',
                    'user_name' => $activity->user_name ?? 'System',
                    'user_email' => $activity->user_email ?? '',
                    'action' => $actionText,
                    'target' => $activity->project_name ?? $activity->task_title ?? '',
                    'entity_type' => $activity->entity_type,
                    'created_at' => $activity->created_at,
                    'time_ago' => Carbon::parse($activity->created_at)->diffForHumans(),
                ];
            }
        }

        // Sort all activities by created_at and take top 10
        usort($activities, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return array_slice($activities, 0, 10);
    }

    /**
     * Format project activity action text
     */
    private function formatProjectActivityAction($activity): string
    {
        $actionMap = [
            'created' => 'kreirao/la je',
            'updated' => 'ažurirao/la je',
            'deleted' => 'obrisao/la je',
            'status_changed' => 'promijenio/la je status',
            'assigned' => 'dodijelio/la je',
            'commented' => 'komentarisao/la je',
            'file_uploaded' => 'uploadovao/la je fajl na',
            'completed' => 'završio/la je',
        ];

        $action = $actionMap[$activity->action] ?? $activity->action;
        $entityType = $activity->entity_type === 'project' ? 'projekat' : 'zadatak';

        return "$action $entityType";
    }

    /**
     * Get recent notifications
     */
    private function getRecentNotifications($user, bool $isAdmin): array
    {
        if (!Schema::hasTable('notifications')) {
            return [];
        }

        $query = DB::table('notifications')
            ->select('notifications.*', 'users.name as user_name')
            ->leftJoin('users', 'notifications.user_id', '=', 'users.id');
        
        if (!$isAdmin) {
            $query->where('notifications.user_id', $user->id);
        }

        return $query->orderBy('notifications.created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'is_read' => (bool) $notification->is_read,
                    'action_url' => $notification->action_url,
                    'user_name' => $notification->user_name,
                    'created_at' => $notification->created_at,
                    'time_ago' => Carbon::parse($notification->created_at)->diffForHumans(),
                ];
            })
            ->toArray();
    }

    /**
     * Get upcoming tasks
     */
    private function getUpcomingTasks($user, bool $isAdmin): array
    {
        if (!Schema::hasTable('tasks')) {
            return [];
        }

        $query = DB::table('tasks')
            ->select('tasks.*', 'projects.name as project_name', 'users.name as assigned_to_name')
            ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
            ->leftJoin('users', 'tasks.assigned_to_id', '=', 'users.id')
            ->whereIn('tasks.status', ['todo', 'in-progress'])
            ->whereNotNull('tasks.due_date')
            ->where('tasks.due_date', '>=', now()->startOfDay());
        
        if (!$isAdmin) {
            $query->where('tasks.assigned_to_id', $user->id);
        }

        return $query->orderBy('tasks.due_date', 'asc')
            ->limit(5)
            ->get()
            ->map(function ($task) {
                $dueDate = Carbon::parse($task->due_date);
                $isOverdue = $dueDate->isPast();
                $isToday = $dueDate->isToday();
                $isTomorrow = $dueDate->isTomorrow();

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'project_name' => $task->project_name,
                    'assigned_to' => $task->assigned_to_name,
                    'status' => $task->status,
                    'priority' => $task->priority ?? 'normal',
                    'due_date' => $task->due_date,
                    'due_date_formatted' => $isToday ? 'Danas' : ($isTomorrow ? 'Sutra' : $dueDate->format('d.m.Y')),
                    'is_overdue' => $isOverdue,
                    'is_today' => $isToday,
                ];
            })
            ->toArray();
    }

    /**
     * Get weekly statistics for charts
     */
    private function getWeeklyStats($user, bool $isAdmin): array
    {
        $stats = [];
        
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateStr = $date->format('Y-m-d');
            $dayName = $date->locale('bs')->dayName;

            // Completed tasks
            $tasksCompleted = 0;
            if (Schema::hasTable('tasks')) {
                $query = DB::table('tasks')
                    ->where('status', 'done')
                    ->whereDate('updated_at', $dateStr);
                
                if (!$isAdmin) {
                    $query->where('assigned_to_id', $user->id);
                }
                $tasksCompleted = $query->count();
            }

            // New activities
            $activities = 0;
            if (Schema::hasTable('activity_log')) {
                $query = DB::table('activity_log')->whereDate('created_at', $dateStr);
                if (!$isAdmin) {
                    $query->where('causer_id', $user->id);
                }
                $activities = $query->count();
            }

            $stats[] = [
                'date' => $dateStr,
                'day' => ucfirst(substr($dayName, 0, 3)),
                'tasks_completed' => $tasksCompleted,
                'activities' => $activities,
            ];
        }

        return $stats;
    }

    /**
     * Get upcoming tasks (API endpoint)
     */
    public function upcomingTasks(Request $request)
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $query = DB::table('tasks')
            ->select('tasks.*', 'projects.name as project_name', 'users.name as assigned_to_name')
            ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
            ->leftJoin('users', 'tasks.assigned_to_id', '=', 'users.id')
            ->whereIn('tasks.status', ['todo', 'in-progress']);
        
        if (!$isAdmin) {
            $query->where('tasks.assigned_to_id', $user->id);
        }

        $tasks = $query->orderBy('tasks.due_date', 'asc')
            ->limit(10)
            ->get();

        return response()->json($tasks);
    }

    /**
     * Get performance data for charts
     */
    public function performance(Request $request)
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);
        $days = $request->input('days', 30);

        $performanceData = [];
        
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            
            $query = DB::table('tasks')
                ->where('status', 'done')
                ->whereDate('updated_at', $date);
            
            if (!$isAdmin) {
                $query->where('assigned_to_id', $user->id);
            }

            $completed = $query->count();

            $performanceData[] = [
                'date' => $date,
                'completed_tasks' => $completed,
            ];
        }

        return response()->json($performanceData);
    }
}

