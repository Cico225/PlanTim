<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CRMController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\DMSController;
use App\Http\Controllers\Api\LMSController;
use App\Http\Controllers\Api\HRMController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\GDPRController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AdminModuleController;
use App\Http\Controllers\Api\DatabaseBackupController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\AppVersionController;
use App\Http\Controllers\Api\PushNotificationController;
use App\Http\Controllers\Api\PlanikaMaloprodajaController;
use App\Http\Controllers\Api\PlanikaFinanceController;
use App\Http\Controllers\Api\RetailControlPlansController;
use App\Http\Controllers\Api\RetailEducationPlansController;
use App\Http\Controllers\Api\RetailControlRecordsController;
use App\Http\Controllers\Api\MeetingRoomController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

// App Version (public, no auth required)
Route::prefix('app-version')->group(function () {
    Route::get('/current', [AppVersionController::class, 'getCurrent']);
    Route::get('/latest', [AppVersionController::class, 'getLatest']);
});

// Public API routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-login', [AuthController::class, 'verifyLogin']);
    Route::post('/resend-login-code', [AuthController::class, 'resendLoginCode']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Avatar endpoint - public but validates token in query parameter
Route::get('/profile/avatar/{userId?}', [AuthController::class, 'getAvatar']);

// Protected API routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // User Profile
    Route::prefix('profile')->group(function () {
        Route::get('/{userId?}', [AuthController::class, 'getProfile']);
        Route::put('/{userId?}', [AuthController::class, 'updateProfile']);
        Route::post('/{userId?}', [AuthController::class, 'updateProfile']); // POST for FormData
        Route::post('/change-password/{userId?}', [AuthController::class, 'changePassword']);
        Route::post('/logout-all/{userId?}', [AuthController::class, 'logoutAllDevices']);
        Route::get('/activity/{userId?}', [AuthController::class, 'getActivity']);
        
        // Admin only
        Route::post('/toggle-status/{userId}', [AuthController::class, 'toggleUserStatus']);
        Route::post('/assign-role/{userId}', [AuthController::class, 'assignRole']);
    });
    
    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/upcoming-tasks', [DashboardController::class, 'upcomingTasks']);
        Route::get('/performance', [DashboardController::class, 'performance']);
    });

    // CRM
    Route::prefix('crm')->group(function () {
        Route::get('/', [CRMController::class, 'index']);
        
        // Contacts
        Route::get('/contacts', [CRMController::class, 'getContacts']);
        Route::get('/contacts/{id}', [CRMController::class, 'getContact']);
        Route::post('/contacts', [CRMController::class, 'storeContact']);
        Route::put('/contacts/{id}', [CRMController::class, 'updateContact']);
        Route::delete('/contacts/{id}', [CRMController::class, 'deleteContact']);
        
        // Companies
        Route::get('/companies', [CRMController::class, 'getCompanies']);
        Route::get('/companies/{id}', [CRMController::class, 'getCompany']);
        Route::post('/companies', [CRMController::class, 'storeCompany']);
        Route::put('/companies/{id}', [CRMController::class, 'updateCompany']);
        Route::delete('/companies/{id}', [CRMController::class, 'deleteCompany']);
        
        // Deals
        Route::get('/deals', [CRMController::class, 'getDeals']);
        Route::get('/deals/{id}', [CRMController::class, 'getDeal']);
        Route::post('/deals', [CRMController::class, 'storeDeal']);
        Route::put('/deals/{id}', [CRMController::class, 'updateDeal']);
        Route::delete('/deals/{id}', [CRMController::class, 'deleteDeal']);
        
        // Activities
        Route::get('/activities', [CRMController::class, 'getActivities']);
        Route::get('/activities/{id}', [CRMController::class, 'getActivity']);
        Route::post('/activities', [CRMController::class, 'storeActivity']);
        Route::put('/activities/{id}', [CRMController::class, 'updateActivity']);
        Route::delete('/activities/{id}', [CRMController::class, 'deleteActivity']);
        Route::put('/activities/{id}/complete', [CRMController::class, 'completeActivity']);
        
        // Tags
        Route::get('/tags', [CRMController::class, 'getTags']);
        Route::post('/tags', [CRMController::class, 'storeTag']);
        Route::post('/{entityType}/{entityId}/tags', [CRMController::class, 'attachTag']);
        Route::delete('/{entityType}/{entityId}/tags/{tagId}', [CRMController::class, 'detachTag']);
        
        // Documents
        Route::get('/{entityType}/{entityId}/documents', [CRMController::class, 'getDocuments']);
        Route::post('/{entityType}/{entityId}/documents', [CRMController::class, 'uploadDocument']);
        Route::get('/documents/{id}/download', [CRMController::class, 'downloadDocument']);
        Route::delete('/documents/{id}', [CRMController::class, 'deleteDocument']);
        
        // Integrations
        Route::post('/deals/{id}/create-project', [CRMController::class, 'createProjectFromDeal']);
        Route::get('/deals/{id}/tasks', [CRMController::class, 'getDealTasks']);
        Route::post('/deals/{id}/tasks', [CRMController::class, 'createTaskForDeal']);
        
        // Timeline
        Route::get('/{entityType}/{entityId}/timeline', [CRMController::class, 'getTimeline']);
        
        // Reporting & Analytics
        Route::get('/reports/funnel', [CRMController::class, 'getFunnelReport']);
        Route::get('/reports/performance', [CRMController::class, 'getDealPerformance']);
        
        // Audit Logs
        Route::get('/{entityType}/{entityId}/audit-logs', [CRMController::class, 'getAuditLogs']);
    });

    // Projects
    Route::prefix('projects')->group(function () {
        Route::get('/', [ProjectController::class, 'index']);
        Route::post('/', [ProjectController::class, 'store']);
        Route::get('/users-and-roles', [ProjectController::class, 'getUsersAndRoles']);
        
        // Time Tracking - Active Timer (must be before /{id} routes)
        Route::get('/time-tracking/active', [ProjectController::class, 'getActiveTimer']);
        
        // Calendar (must be before /{id} routes)
        Route::get('/calendar/data', [ProjectController::class, 'getCalendarData']);
        
        // Timeline
        Route::get('/timeline', [ProjectController::class, 'getTimeline']);
        
        // Gantt Chart (must be before /{id} routes to handle "all" correctly)
        Route::get('/{projectId}/gantt', [ProjectController::class, 'getGanttChart']);
        Route::put('/{projectId}/tasks/{taskId}/dates', [ProjectController::class, 'updateTaskDates']);
        
        // Tasks
        Route::get('/{projectId}/tasks', [ProjectController::class, 'getTasks']);
        Route::post('/{projectId}/tasks', [ProjectController::class, 'storeTask']);
        Route::put('/{projectId}/tasks/{taskId}', [ProjectController::class, 'updateTask']);
        Route::delete('/{projectId}/tasks/{taskId}', [ProjectController::class, 'deleteTask']);
        Route::post('/{projectId}/tasks/{taskId}/move', [ProjectController::class, 'moveTaskInKanban']);
        
        // Task Comments
        Route::get('/{projectId}/tasks/{taskId}/comments', [ProjectController::class, 'getTaskComments']);
        Route::post('/{projectId}/tasks/{taskId}/comments', [ProjectController::class, 'storeTaskComment']);
        Route::put('/{projectId}/tasks/{taskId}/comments/{commentId}', [ProjectController::class, 'updateTaskComment']);
        Route::delete('/{projectId}/tasks/{taskId}/comments/{commentId}', [ProjectController::class, 'deleteTaskComment']);
        
        // Task Attachments
        Route::get('/{projectId}/tasks/{taskId}/attachments', [ProjectController::class, 'getTaskAttachments']);
        Route::post('/{projectId}/tasks/{taskId}/attachments', [ProjectController::class, 'uploadTaskAttachment']);
        Route::get('/{projectId}/tasks/{taskId}/attachments/{attachmentId}/download', [ProjectController::class, 'downloadTaskAttachment']);
        Route::delete('/{projectId}/tasks/{taskId}/attachments/{attachmentId}', [ProjectController::class, 'deleteTaskAttachment']);
        
        // Task Assignees
        Route::get('/{projectId}/tasks/{taskId}/assignees', [ProjectController::class, 'getTaskAssignees']);
        Route::post('/{projectId}/tasks/{taskId}/assignees', [ProjectController::class, 'addTaskAssignees']);
        Route::delete('/{projectId}/tasks/{taskId}/assignees/{userId}', [ProjectController::class, 'removeTaskAssignee']);
        
        // Task Dependencies
        Route::get('/{projectId}/tasks/{taskId}/dependencies', [ProjectController::class, 'getTaskDependencies']);
        Route::post('/{projectId}/tasks/{taskId}/dependencies', [ProjectController::class, 'addTaskDependency']);
        Route::delete('/{projectId}/tasks/{taskId}/dependencies/{dependencyId}', [ProjectController::class, 'removeTaskDependency']);
        
        // Time Tracking
        Route::get('/{projectId}/tasks/{taskId}/time-tracking', [ProjectController::class, 'getTaskTimeTracking']);
        Route::post('/{projectId}/tasks/{taskId}/time-tracking/start', [ProjectController::class, 'startTimeTracking']);
        Route::post('/{projectId}/tasks/{taskId}/time-tracking/stop', [ProjectController::class, 'stopTimeTracking']);
        Route::post('/{projectId}/tasks/{taskId}/time-tracking/manual', [ProjectController::class, 'addManualTimeEntry']);
        Route::delete('/{projectId}/tasks/{taskId}/time-tracking/{timeEntryId}', [ProjectController::class, 'deleteTimeEntry']);
        
        // Kanban Board
        Route::get('/{projectId}/kanban', [ProjectController::class, 'getKanbanBoard']);
        Route::get('/{projectId}/kanban/columns', [ProjectController::class, 'getKanbanColumns']);
        Route::post('/{projectId}/kanban/columns', [ProjectController::class, 'createKanbanColumn']);
        Route::put('/{projectId}/kanban/columns/{columnId}', [ProjectController::class, 'updateKanbanColumn']);
        Route::delete('/{projectId}/kanban/columns/{columnId}', [ProjectController::class, 'deleteKanbanColumn']);
        Route::put('/{projectId}/kanban/tasks/{taskId}/move', [ProjectController::class, 'moveTaskInKanban']);
        
        // Project CRUD (must be last to avoid conflicts)
        Route::get('/{id}', [ProjectController::class, 'show']);
        Route::put('/{id}', [ProjectController::class, 'update']);
        Route::delete('/{id}', [ProjectController::class, 'destroy']);
    });

    // Personal Tasks (outside of projects)
    Route::prefix('tasks')->group(function () {
        Route::get('/personal', [ProjectController::class, 'getPersonalTasks']);
        Route::post('/personal', [ProjectController::class, 'storePersonalTask']);
        Route::put('/personal/{taskId}', [ProjectController::class, 'updatePersonalTask']);
        Route::delete('/personal/{taskId}', [ProjectController::class, 'deletePersonalTask']);
    });

    // DMS
    Route::prefix('dms')->group(function () {
        Route::get('/stats', [DMSController::class, 'getStats']);
        Route::get('/documents', [DMSController::class, 'index']);
        Route::post('/documents/upload', [DMSController::class, 'upload']);
        Route::get('/documents/{id}/download', [DMSController::class, 'download']);
        Route::put('/documents/{id}/move', [DMSController::class, 'moveDocument']);
        Route::delete('/documents/{id}', [DMSController::class, 'destroy']);
        Route::get('/documents/{id}/versions', [DMSController::class, 'getVersions']);
        Route::get('/documents/{documentId}/versions/{versionId}/download', [DMSController::class, 'downloadVersion']);
        
        Route::get('/folders', [DMSController::class, 'getFolders']);
        Route::get('/folders/tree', [DMSController::class, 'getFolderTree']);
        Route::post('/folders', [DMSController::class, 'createFolder']);
        Route::delete('/folders/{id}', [DMSController::class, 'deleteFolder']);
        Route::get('/folders/users-roles', [DMSController::class, 'getUsersAndRoles']);
        
        Route::post('/documents/{documentId}/share', [DMSController::class, 'createShareLink']);
    });

    // LMS
    Route::prefix('lms')->group(function () {
        // Users and roles
        Route::get('/users-and-roles', [LMSController::class, 'getUsersAndRoles']);
        
        // Dashboard
        Route::get('/dashboard', [LMSController::class, 'getDashboardStats']);
        
        // Reports
        Route::get('/reports', [LMSController::class, 'getAdminReports']);
        
        // Leaderboard
        Route::get('/leaderboard', [LMSController::class, 'getLeaderboard']);
        
        // Badges
        Route::get('/badges', [LMSController::class, 'getBadges']);
        
        // Courses
        Route::get('/courses', [LMSController::class, 'index']);
        Route::get('/courses/my-enrollments', [LMSController::class, 'myEnrollments']);
        Route::get('/courses/{id}', [LMSController::class, 'show']);
        Route::post('/courses', [LMSController::class, 'store']);
        Route::put('/courses/{id}', [LMSController::class, 'update']);
        Route::delete('/courses/{id}', [LMSController::class, 'destroy']);
        Route::post('/courses/{courseId}/enroll', [LMSController::class, 'enroll']);
        Route::put('/courses/{courseId}/progress', [LMSController::class, 'updateProgress']);
        
        // Lessons
        Route::get('/courses/{courseId}/lessons', [LMSController::class, 'getLessons']);
        Route::get('/courses/{courseId}/lessons/{lessonId}', [LMSController::class, 'getLesson']);
        Route::post('/courses/{courseId}/lessons', [LMSController::class, 'storeLesson']);
        Route::post('/courses/{courseId}/lessons/{lessonId}/complete', [LMSController::class, 'completeLesson']);
        
        // Quizzes
        Route::get('/courses/{courseId}/quizzes', [LMSController::class, 'getQuizzes']);
        Route::get('/courses/{courseId}/quizzes/{quizId}', [LMSController::class, 'getQuiz']);
        Route::post('/courses/{courseId}/quizzes', [LMSController::class, 'storeQuiz']);
        Route::post('/courses/{courseId}/quizzes/{quizId}/submit', [LMSController::class, 'submitQuiz']);
        Route::get('/courses/{courseId}/quizzes/{quizId}/attempts', [LMSController::class, 'getQuizAttempts']);
        
        // Certificates (specific routes first to avoid conflicts)
        Route::get('/certificates', [LMSController::class, 'getCertificates']);
        Route::get('/certificates/available', [LMSController::class, 'getAvailableCertificates']);
        Route::post('/certificates/check/{courseId}', [LMSController::class, 'checkAndGenerateCertificate']);
        // These must be last to avoid catching /certificates/check/{courseId}
        Route::get('/certificates/{certificateId}/pdf', [LMSController::class, 'downloadCertificatePdf']);
        Route::get('/certificates/{certificateId}', [LMSController::class, 'getCertificate']);
        
        // Surprises
        Route::get('/courses/{courseId}/surprises', [LMSController::class, 'getCourseSurprises']);
        Route::put('/courses/{courseId}/surprises', [LMSController::class, 'updateCourseSurprises']);
        Route::post('/courses/{courseId}/surprises/rewards', [LMSController::class, 'saveSurpriseReward']);
        Route::delete('/courses/{courseId}/surprises/rewards/{rewardId}', [LMSController::class, 'deleteSurpriseReward']);
        Route::get('/courses/{courseId}/quizzes/{quizId}/surprises/check', [LMSController::class, 'checkSurpriseAvailability']);
        Route::post('/courses/{courseId}/surprises/play', [LMSController::class, 'playSurprise']);
        Route::get('/courses/{courseId}/surprises/attempts', [LMSController::class, 'getUserSurpriseAttempts']);
        
        // Course image upload
        Route::post('/courses/upload-image', [LMSController::class, 'uploadCourseImage']);
        
        // Lesson image and file upload
        Route::post('/lessons/upload-image', [LMSController::class, 'uploadLessonImage']);
        Route::post('/lessons/upload-file', [LMSController::class, 'uploadLessonFile']);
    });

    // HRM
    Route::prefix('hrm')->group(function () {
        // Dashboard
        Route::get('/dashboard', function() {
            return response()->json([
                'stats' => [
                    'total_employees' => 0,
                    'active_employees' => 0,
                    'on_leave_today' => 0,
                    'pending_leaves' => 0,
                    'pending_evaluations' => 0,
                    'expiring_contracts' => 0,
                    'onboarding_in_progress' => 0,
                    'offboarding_in_progress' => 0,
                    'new_hires_this_month' => 0,
                    'terminations_this_month' => 0,
                ],
                'recent_activities' => [],
                'alerts' => [],
            ]);
        });
        
        // Alerts
        Route::get('/alerts', function(Request $request) {
            return response()->json([]);
        });
        
        Route::get('/employees', [HRMController::class, 'index']);
        Route::get('/employees/{id}', [HRMController::class, 'show']);
        Route::post('/employees', [HRMController::class, 'store']);
        Route::put('/employees/{id}', [HRMController::class, 'update']);
        Route::delete('/employees/{id}', [HRMController::class, 'destroy']);
        Route::post('/employees/import', [HRMController::class, 'import']);
        
        Route::get('/departments', [HRMController::class, 'getDepartments']);
        Route::get('/departments/{id}', [HRMController::class, 'getDepartment']);
        Route::post('/departments', [HRMController::class, 'storeDepartment']);
        Route::put('/departments/{id}', [HRMController::class, 'updateDepartment']);
        Route::delete('/departments/{id}', [HRMController::class, 'deleteDepartment']);
        
        // Stores
        Route::get('/stores', [HRMController::class, 'getStores']);
        Route::post('/stores', [HRMController::class, 'createStore']);
        Route::put('/stores/{id}', [HRMController::class, 'updateStore']);
        Route::delete('/stores/{id}', [HRMController::class, 'deleteStore']);
        
        // Work Positions
        Route::get('/work-positions', [HRMController::class, 'getWorkPositions']);
        Route::post('/work-positions', [HRMController::class, 'createWorkPosition']);
        Route::put('/work-positions/{id}', [HRMController::class, 'updateWorkPosition']);
        Route::delete('/work-positions/{id}', [HRMController::class, 'deleteWorkPosition']);
        
        Route::get('/leaves', [HRMController::class, 'getLeaves']);
        Route::post('/leaves', [HRMController::class, 'requestLeave']);
        Route::put('/leaves/{leaveId}/status', [HRMController::class, 'updateLeaveStatus']);
        
        Route::get('/time-entries', [HRMController::class, 'getTimeEntries']);
        Route::post('/time-entries/clock', [HRMController::class, 'clockInOut']);
        
        // ATS - Applicant Tracking System
        Route::prefix('ats')->group(function () {
            // Positions
            Route::get('/positions', [HRMController::class, 'getPositions']);
            Route::get('/positions/{id}', [HRMController::class, 'getPosition']);
            Route::post('/positions', [HRMController::class, 'createPosition']);
            Route::put('/positions/{id}', [HRMController::class, 'updatePosition']);
            Route::delete('/positions/{id}', [HRMController::class, 'deletePosition']);
            
            // Candidates
            Route::get('/candidates', [HRMController::class, 'getCandidates']);
            Route::get('/candidates/{id}', [HRMController::class, 'getCandidate']);
            Route::post('/candidates', [HRMController::class, 'createCandidate']);
            Route::put('/candidates/{id}', [HRMController::class, 'updateCandidate']);
            Route::delete('/candidates/{id}', [HRMController::class, 'deleteCandidate']);
            
            // Interviews
            Route::get('/interviews', [HRMController::class, 'getInterviews']);
            Route::get('/interviews/{id}', [HRMController::class, 'getInterview']);
            Route::post('/interviews', [HRMController::class, 'createInterview']);
            Route::put('/interviews/{id}', [HRMController::class, 'updateInterview']);
            Route::delete('/interviews/{id}', [HRMController::class, 'deleteInterview']);
            
            // Offers
            Route::get('/offers', [HRMController::class, 'getOffers']);
            Route::get('/offers/{id}', [HRMController::class, 'getOffer']);
            Route::post('/offers', [HRMController::class, 'createOffer']);
            Route::put('/offers/{id}', [HRMController::class, 'updateOffer']);
            Route::delete('/offers/{id}', [HRMController::class, 'deleteOffer']);
            Route::post('/offers/{id}/send', [HRMController::class, 'sendOffer']);
            Route::post('/offers/{id}/accept', [HRMController::class, 'acceptOffer']);
            Route::post('/offers/{id}/reject', [HRMController::class, 'rejectOffer']);
        });

        // Onboarding
        Route::get('/onboarding', [HRMController::class, 'getOnboardingProcesses']);
        Route::get('/onboarding/templates', [HRMController::class, 'getOnboardingTemplates']);
        Route::post('/onboarding', [HRMController::class, 'startOnboardingProcess']);
        Route::get('/onboarding/{id}', [HRMController::class, 'getOnboardingProcess']);
        Route::get('/onboarding/{id}/tasks', [HRMController::class, 'getOnboardingProcessTasks']);
        Route::put('/onboarding/{id}/tasks/{taskId}', [HRMController::class, 'updateOnboardingTask']);
        Route::put('/onboarding/{id}/status', [HRMController::class, 'updateOnboardingProcessStatus']);
    });

    // Retail Control Plans (Plan kontrola i obilazaka)
    Route::prefix('retail')->group(function () {
        // Overview stats
        Route::get('/overview-stats', [RetailControlPlansController::class, 'getOverviewStats']);
        
        // Reports
        Route::get('/reports', [RetailControlPlansController::class, 'getReports']);
        
        // Education plans
        Route::prefix('education-plans')->group(function () {
            Route::get('/', [RetailEducationPlansController::class, 'index']);
            Route::post('/', [RetailEducationPlansController::class, 'store']);
            Route::get('/{id}', [RetailEducationPlansController::class, 'show']);
            Route::put('/{id}', [RetailEducationPlansController::class, 'update']);
            Route::delete('/{id}', [RetailEducationPlansController::class, 'destroy']);
            Route::get('/stores/{storeId}/employees', [RetailEducationPlansController::class, 'getEmployeesByStore']);
        });
        
        // Control records (Evidencija kontrola i obilazaka)
        Route::prefix('control-records')->group(function () {
            Route::get('/', [RetailControlRecordsController::class, 'index']);
            Route::post('/', [RetailControlRecordsController::class, 'store']);
            Route::get('/{id}', [RetailControlRecordsController::class, 'show']);
            Route::put('/{id}', [RetailControlRecordsController::class, 'update']);
            Route::delete('/{id}', [RetailControlRecordsController::class, 'destroy']);
            Route::post('/{id}/attachments', [RetailControlRecordsController::class, 'uploadAttachment']);
            Route::get('/{id}/attachments/{attachmentId}', [RetailControlRecordsController::class, 'getAttachment']);
            Route::delete('/{id}/attachments/{attachmentId}', [RetailControlRecordsController::class, 'deleteAttachment']);
            Route::post('/{id}/sign', [RetailControlRecordsController::class, 'sign']);
            Route::post('/{id}/finalize', [RetailControlRecordsController::class, 'finalize']);
            Route::post('/{id}/lock', [RetailControlRecordsController::class, 'lock']);
            Route::get('/{id}/pdf', [RetailControlRecordsController::class, 'generatePdf']);
        });
        
        // Control plans
        Route::prefix('control-plans')->group(function () {
            Route::get('/', [RetailControlPlansController::class, 'index']);
            Route::post('/', [RetailControlPlansController::class, 'store']);
            Route::get('/{id}', [RetailControlPlansController::class, 'show']);
            Route::put('/{id}', [RetailControlPlansController::class, 'update']);
            Route::delete('/{id}', [RetailControlPlansController::class, 'destroy']);
            
            // Plan items
            Route::get('/{planId}/items', [RetailControlPlansController::class, 'getItems']);
            Route::post('/{planId}/items', [RetailControlPlansController::class, 'createItem']);
            Route::put('/{planId}/items/{itemId}', [RetailControlPlansController::class, 'updateItem']);
            Route::delete('/{planId}/items/{itemId}', [RetailControlPlansController::class, 'deleteItem']);
        });
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/', [NotificationController::class, 'create']);
        Route::post('/bulk', [NotificationController::class, 'bulkCreate']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/stats', [NotificationController::class, 'getStats']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
        Route::delete('/clear-read', [NotificationController::class, 'clearRead']);
        Route::get('/settings', [NotificationController::class, 'getSettings']);
        Route::put('/settings', [NotificationController::class, 'updateSettings']);
        Route::post('/system', [NotificationController::class, 'sendSystemNotification']);
    });

    // Push Notifications
    Route::prefix('push')->group(function () {
        Route::get('/vapid-key', [PushNotificationController::class, 'getVapidPublicKey']);
        Route::post('/subscribe', [PushNotificationController::class, 'subscribe']);
        Route::post('/unsubscribe', [PushNotificationController::class, 'unsubscribe']);
        Route::get('/status', [PushNotificationController::class, 'getStatus']);
        Route::get('/pending', [PushNotificationController::class, 'getPending']);
        Route::post('/test', [PushNotificationController::class, 'sendTest']);
    });

    // GDPR
    Route::prefix('gdpr')->group(function () {
        Route::get('/consents', [GDPRController::class, 'getConsents']);
        Route::post('/consents', [GDPRController::class, 'updateConsent']);
        
        Route::post('/data-export', [GDPRController::class, 'requestDataExport']);
        Route::get('/data-exports', [GDPRController::class, 'getDataExports']);
        Route::get('/data-exports/{id}/download', [GDPRController::class, 'downloadDataExport']);
        
        Route::post('/data-deletion', [GDPRController::class, 'requestDataDeletion']);
        Route::get('/data-deletions', [GDPRController::class, 'getDataDeletions']);
        
        Route::get('/audit-log', [GDPRController::class, 'getAuditLog']);
    });

    // Chat (legacy - kept for compatibility)
    Route::prefix('chat')->group(function () {
        Route::get('/users', [ChatController::class, 'getUsers']);
        Route::get('/conversations', [ChatController::class, 'getConversations']);
        Route::post('/conversations', [ChatController::class, 'createConversation']);
        Route::get('/conversations/{conversationId}', [ChatController::class, 'getConversationInfo']);
        Route::delete('/conversations/{conversationId}', [ChatController::class, 'deleteConversation']);
        Route::get('/conversations/{conversationId}/messages', [ChatController::class, 'getMessages']);
        Route::post('/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage']);
        Route::put('/conversations/{conversationId}/read', [ChatController::class, 'markAsRead']);
        Route::post('/conversations/{conversationId}/participants', [ChatController::class, 'addParticipant']);
        Route::delete('/conversations/{conversationId}/participants/{userId}', [ChatController::class, 'removeParticipant']);
        Route::post('/upload-file', [ChatController::class, 'uploadFile']);
        Route::get('/search', [ChatController::class, 'searchMessages']);
        Route::put('/messages/{messageId}', [ChatController::class, 'editMessage']);
        Route::delete('/messages/{messageId}', [ChatController::class, 'deleteMessage']);
    });

    // Inbox (Internal Messages)
    Route::prefix('inbox')->group(function () {
        Route::get('/', [InboxController::class, 'getInbox']);
        Route::get('/unread-count', [InboxController::class, 'getUnreadCount']);
        Route::get('/recent', [InboxController::class, 'getRecentMessages']);
        Route::get('/recipients', [InboxController::class, 'getRecipients']);
        Route::get('/roles', [InboxController::class, 'getRoles']);
        Route::get('/can-send', [InboxController::class, 'checkSendPermission']);
        Route::post('/send', [InboxController::class, 'sendMessage']);
        Route::get('/{messageId}', [InboxController::class, 'getMessage']);
        Route::post('/{messageId}/reply', [InboxController::class, 'replyMessage']);
        Route::put('/{messageId}/read', [InboxController::class, 'markAsRead']);
        Route::put('/mark-all-read', [InboxController::class, 'markAllAsRead']);
        Route::put('/{messageId}/archive', [InboxController::class, 'archiveMessage']);
        Route::put('/{messageId}/unarchive', [InboxController::class, 'unarchiveMessage']);
        Route::delete('/{messageId}', [InboxController::class, 'deleteMessage']);
        
        // Admin routes for managing senders
        Route::get('/admin/senders', [InboxController::class, 'getSenders']);
        Route::post('/admin/senders', [InboxController::class, 'grantSendPermission']);
        Route::delete('/admin/senders/{userId}', [InboxController::class, 'revokeSendPermission']);
    });

    // AI
    Route::prefix('ai')->group(function () {
        Route::get('/chats', [AIController::class, 'getChatHistory']);
        Route::get('/chats/{chatId}/messages', [AIController::class, 'getChatMessages']);
        Route::post('/chat', [AIController::class, 'sendMessage']);
        Route::post('/generate-document', [AIController::class, 'generateDocument']);
        Route::post('/semantic-search', [AIController::class, 'semanticSearch']);
    });

    // Planika Maloprodaja
    Route::prefix('planika/maloprodaja')->group(function () {
        // Regions
        Route::get('/regions', [PlanikaMaloprodajaController::class, 'getRegions']);
        Route::get('/regions/{id}', [PlanikaMaloprodajaController::class, 'getRegion']);
        Route::post('/regions', [PlanikaMaloprodajaController::class, 'createRegion']);
        Route::put('/regions/{id}', [PlanikaMaloprodajaController::class, 'updateRegion']);
        Route::delete('/regions/{id}', [PlanikaMaloprodajaController::class, 'deleteRegion']);

        // Stores
        Route::get('/stores', [PlanikaMaloprodajaController::class, 'getStores']);
        Route::get('/stores/{id}', [PlanikaMaloprodajaController::class, 'getStore']);
        Route::post('/stores', [PlanikaMaloprodajaController::class, 'createStore']);
        Route::put('/stores/{id}', [PlanikaMaloprodajaController::class, 'updateStore']);
        Route::delete('/stores/{id}', [PlanikaMaloprodajaController::class, 'deleteStore']);

        // Activity Plans
        Route::get('/plans', [PlanikaMaloprodajaController::class, 'getActivityPlans']);
        Route::get('/plans/{id}', [PlanikaMaloprodajaController::class, 'getActivityPlan']);
        Route::post('/plans', [PlanikaMaloprodajaController::class, 'createActivityPlan']);
        Route::put('/plans/{id}', [PlanikaMaloprodajaController::class, 'updateActivityPlan']);
        Route::post('/plans/{id}/assign', [PlanikaMaloprodajaController::class, 'assignPlan']);
        Route::post('/plans/{id}/acknowledge', [PlanikaMaloprodajaController::class, 'acknowledgePlan']);

        // Control Forms
        Route::get('/control-forms', [PlanikaMaloprodajaController::class, 'getControlForms']);
        Route::get('/control-forms/{id}', [PlanikaMaloprodajaController::class, 'getControlForm']);
        Route::post('/control-forms', [PlanikaMaloprodajaController::class, 'createControlForm']);
        Route::put('/control-forms/{id}', [PlanikaMaloprodajaController::class, 'updateControlForm']);

        // Store Controls
        Route::get('/controls', [PlanikaMaloprodajaController::class, 'getStoreControls']);
        Route::get('/controls/{id}', [PlanikaMaloprodajaController::class, 'getStoreControl']);
        Route::post('/controls', [PlanikaMaloprodajaController::class, 'createStoreControl']);
        Route::put('/controls/{id}', [PlanikaMaloprodajaController::class, 'updateStoreControl']);

        // Evaluation Criteria
        Route::get('/evaluation-criteria', [PlanikaMaloprodajaController::class, 'getEvaluationCriteria']);
        Route::get('/evaluation-criteria/{id}', [PlanikaMaloprodajaController::class, 'getEvaluationCriterion']);
        Route::post('/evaluation-criteria', [PlanikaMaloprodajaController::class, 'createEvaluationCriteria']);
        Route::put('/evaluation-criteria/{id}', [PlanikaMaloprodajaController::class, 'updateEvaluationCriteria']);

        // Employee Evaluations - Specific routes first (before {id} routes)
        
        // Manager Evaluations (must be before /evaluations/{id})
        Route::get('/evaluations/managers', [PlanikaMaloprodajaController::class, 'getManagerEvaluations']);
        Route::post('/evaluations/managers', [PlanikaMaloprodajaController::class, 'createManagerEvaluation']);
        Route::put('/evaluations/managers/{id}', [PlanikaMaloprodajaController::class, 'updateManagerEvaluation']);

        // Sales Staff Evaluations (must be before /evaluations/{id})
        Route::get('/evaluations/sales-staff', [PlanikaMaloprodajaController::class, 'getSalesStaffEvaluations']);
        Route::post('/evaluations/sales-staff', [PlanikaMaloprodajaController::class, 'createSalesStaffEvaluation']);
        Route::put('/evaluations/sales-staff/{id}', [PlanikaMaloprodajaController::class, 'updateSalesStaffEvaluation']);

        // Employee Evaluations (General) - must be after specific routes
        Route::get('/evaluations', [PlanikaMaloprodajaController::class, 'getEmployeeEvaluations']);
        Route::post('/evaluations', [PlanikaMaloprodajaController::class, 'createEmployeeEvaluation']);
        Route::get('/evaluations/{id}', [PlanikaMaloprodajaController::class, 'getEmployeeEvaluation']);
        Route::put('/evaluations/{id}', [PlanikaMaloprodajaController::class, 'updateEmployeeEvaluation']);
        Route::post('/evaluations/{id}/acknowledge', [PlanikaMaloprodajaController::class, 'acknowledgeEvaluation']);
        Route::post('/evaluations/{id}/sign', [PlanikaMaloprodajaController::class, 'signEvaluation']);
        Route::get('/evaluations/{id}/pdf', [PlanikaMaloprodajaController::class, 'getEvaluationPdf']);
        Route::delete('/evaluations/{id}', [PlanikaMaloprodajaController::class, 'deleteEmployeeEvaluation']);

        // Talents (Career Development)
        Route::get('/talents', [PlanikaMaloprodajaController::class, 'getTalents']);
        Route::post('/talents', [PlanikaMaloprodajaController::class, 'createTalent']);
        Route::put('/talents/{id}', [PlanikaMaloprodajaController::class, 'updateTalent']);

        // Rewards and Bonuses
        Route::get('/rewards', [PlanikaMaloprodajaController::class, 'getRewards']);
        Route::post('/rewards', [PlanikaMaloprodajaController::class, 'createReward']);
        Route::put('/rewards/{id}', [PlanikaMaloprodajaController::class, 'updateReward']);

        // Sales Plans (Mjesečni planovi)
        Route::get('/sales-plans', [PlanikaMaloprodajaController::class, 'getSalesPlans']);
        Route::get('/sales-plans/{id}', [PlanikaMaloprodajaController::class, 'getSalesPlan']);
        Route::post('/sales-plans', [PlanikaMaloprodajaController::class, 'createSalesPlan']);
        Route::post('/sales-plans/upload', [PlanikaMaloprodajaController::class, 'uploadSalesPlans']);
        Route::put('/sales-plans/{id}', [PlanikaMaloprodajaController::class, 'updateSalesPlan']);
        Route::delete('/sales-plans/{id}', [PlanikaMaloprodajaController::class, 'deleteSalesPlan']);

        // Sales Results (Rezultati prodaje)
        Route::get('/sales-results', [PlanikaMaloprodajaController::class, 'getSalesResults']);
        Route::post('/sales-results/upload', [PlanikaMaloprodajaController::class, 'uploadSalesResults']);

        // Sales Performance (Plan vs Rezultati)
        Route::get('/sales-performance', [PlanikaMaloprodajaController::class, 'getSalesPerformance']);

        // Reports
        Route::get('/reports', [PlanikaMaloprodajaController::class, 'getReports']);

        // Audit Logs
        Route::get('/audit-logs', [PlanikaMaloprodajaController::class, 'getAuditLogs']);

        // Store Categorization
        Route::put('/stores/{id}/category', [PlanikaMaloprodajaController::class, 'updateStoreCategory']);
        Route::post('/stores/auto-categorize', [PlanikaMaloprodajaController::class, 'autoCategorizeStores']);

        // Visit Schedules (Kalendar obilazaka)
        Route::get('/visit-schedules', [PlanikaMaloprodajaController::class, 'getVisitSchedules']);
        Route::post('/plans/{id}/generate-schedule', [PlanikaMaloprodajaController::class, 'generateVisitSchedule']);

        // Store Visits (Obilasci)
        Route::get('/visits', [PlanikaMaloprodajaController::class, 'getStoreVisits']);
        Route::post('/visit-schedules/{id}/check-in', [PlanikaMaloprodajaController::class, 'checkInVisit']);
        Route::post('/visits/{id}/check-out', [PlanikaMaloprodajaController::class, 'checkOutVisit']);

        // Automated Scenarios
        Route::get('/automated-scenarios', [PlanikaMaloprodajaController::class, 'checkAutomatedScenarios']);
    });

    // Planika Finansije (Krediti)
    Route::prefix('planika/finance')->group(function () {
        Route::get('/krediti', [PlanikaFinanceController::class, 'getKrediti']);
        Route::get('/krediti/report', [PlanikaFinanceController::class, 'getKreditiReport']);
        Route::get('/krediti/export-zabrane', [PlanikaFinanceController::class, 'exportZabrane']);
        Route::get('/krediti/selection', [PlanikaFinanceController::class, 'getKreditiSelection']);
        Route::get('/krediti/lookup', [PlanikaFinanceController::class, 'lookupKredit']);
        Route::get('/krediti/{id}', [PlanikaFinanceController::class, 'getKredit']);
        Route::post('/krediti/upload', [PlanikaFinanceController::class, 'uploadKrediti']);
        Route::post('/krediti/bulk-verify-zabrana', [PlanikaFinanceController::class, 'bulkVerifyZabrana']);
        Route::post('/krediti/bulk-unpair-zabrana', [PlanikaFinanceController::class, 'bulkUnpairZabrana']);
        Route::post('/krediti/{id}/verify-zabrana', [PlanikaFinanceController::class, 'verifyZabrana']);
        Route::post('/krediti/{id}/unpair-zabrana', [PlanikaFinanceController::class, 'unpairZabrana']);
    });

    // Meeting Rooms (Kalendar zauzetosti sala za sastanke)
    Route::prefix('meeting-rooms')->group(function () {
        Route::get('/rooms', [MeetingRoomController::class, 'getRooms']);
        Route::get('/reservations', [MeetingRoomController::class, 'getReservations']);
        Route::post('/reservations', [MeetingRoomController::class, 'createReservation']);
        Route::put('/reservations/{id}', [MeetingRoomController::class, 'updateReservation']);
        Route::delete('/reservations/{id}', [MeetingRoomController::class, 'deleteReservation']);
    });

    // Admin - protected routes
    Route::prefix('admin')->group(function () {
        // System Stats
        Route::get('/stats', [AdminController::class, 'getSystemStats']);
        
        // Users
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{userId}/assign-role', [AdminController::class, 'assignRole']);
        
        // Roles & Permissions
        Route::get('/roles', [AdminController::class, 'getRoles']);
        Route::post('/roles', [AdminController::class, 'createRole']);
        Route::put('/roles/{id}', [AdminController::class, 'updateRole']);
        Route::delete('/roles/{id}', [AdminController::class, 'deleteRole']);
        Route::get('/permissions', [AdminController::class, 'getPermissions']);
        
        // Settings
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::put('/settings', [AdminController::class, 'updateSettings']);
        
        // Logs
        Route::get('/activity-logs', [AdminController::class, 'getActivityLogs']);
        
        // Module & Plugin Management
        Route::get('/modules', [AdminModuleController::class, 'getModules']);
        Route::post('/modules', [AdminModuleController::class, 'updateModule']);
        Route::put('/modules/{id}', [AdminModuleController::class, 'updateModule']);
        Route::delete('/modules/{id}', [AdminModuleController::class, 'deleteModule']);
        
        // User Module Permissions
        Route::get('/users/{userId}/module-permissions', [AdminModuleController::class, 'getUserModulePermissions']);
        Route::put('/users/{userId}/module-permissions', [AdminModuleController::class, 'updateUserModulePermissions']);
        Route::post('/copy-permissions', [AdminModuleController::class, 'copyUserPermissions']);
        
        // Role Module Permissions
        Route::get('/roles', [AdminModuleController::class, 'getRoles']);
        Route::get('/roles/{roleId}/module-permissions', [AdminModuleController::class, 'getRoleModulePermissions']);
        Route::put('/roles/{roleId}/module-permissions', [AdminModuleController::class, 'updateRoleModulePermissions']);
        
        // Plugin Settings
        Route::get('/plugins/{pluginName}/settings', [AdminModuleController::class, 'getPluginSettings']);
        Route::put('/plugins/{pluginName}/settings', [AdminModuleController::class, 'updatePluginSettings']);
        
        // Database Backup & Restore
        Route::get('/database-backup/stats', [DatabaseBackupController::class, 'getStats']);
        Route::get('/database-backup/list', [DatabaseBackupController::class, 'listBackups']);
        Route::get('/database-backup/test', [DatabaseBackupController::class, 'testConnection']);
        Route::post('/database-backup/create', [DatabaseBackupController::class, 'createBackup']);
        Route::get('/database-backup/download/{filename}', [DatabaseBackupController::class, 'downloadBackup']);
        Route::post('/database-backup/restore', [DatabaseBackupController::class, 'restoreBackup']);
        Route::post('/database-backup/upload-restore', [DatabaseBackupController::class, 'uploadAndRestore']);
        Route::delete('/database-backup/{filename}', [DatabaseBackupController::class, 'deleteBackup']);
        
        // Security & GDPR Admin
        Route::get('/security/settings', [SecurityController::class, 'getSecuritySettings']);
        Route::put('/security/settings', [SecurityController::class, 'updateSecuritySettings']);
        Route::get('/security/stats', [SecurityController::class, 'getSecurityStats']);
        Route::get('/security/failed-logins', [SecurityController::class, 'getFailedLoginAttempts']);
        Route::post('/security/unblock', [SecurityController::class, 'unblock']);
        Route::get('/security/sessions', [SecurityController::class, 'getActiveSessions']);
        Route::delete('/security/sessions/{tokenId}', [SecurityController::class, 'revokeSession']);
        
        // GDPR Admin
        Route::get('/gdpr/stats', [GDPRController::class, 'getGDPRStats']);
        Route::get('/gdpr/all-consents', [GDPRController::class, 'getAllConsents']);
        Route::get('/gdpr/all-exports', [GDPRController::class, 'getAllDataExports']);
        Route::put('/gdpr/exports/{id}/process', [GDPRController::class, 'processDataExport']);
        Route::get('/gdpr/all-deletions', [GDPRController::class, 'getAllDataDeletions']);
        Route::put('/gdpr/deletions/{id}/process', [GDPRController::class, 'processDataDeletion']);
        
        // AI Configuration Admin
        Route::get('/ai/config', [AIController::class, 'getAIConfig']);
        Route::put('/ai/config', [AIController::class, 'updateAIConfig']);
        Route::get('/ai/stats', [AIController::class, 'getAIStats']);
        Route::get('/ai/chat-logs', [AIController::class, 'getAIChatLogs']);
        Route::post('/ai/test-connection', [AIController::class, 'testAIConnection']);
    });
});

// User accessible modules (for menu generation) - outside admin group so all authenticated users can access
Route::middleware('auth:sanctum')->get('/user/accessible-modules', [AdminModuleController::class, 'getUserAccessibleModules']);

// Public security settings (available to all authenticated users for auto-logout functionality)
Route::middleware('auth:sanctum')->get('/security/public-settings', [SecurityController::class, 'getPublicSecuritySettings']);

