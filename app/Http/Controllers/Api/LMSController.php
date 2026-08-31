<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lms\Course;
use App\Models\Lms\Lesson;
use App\Models\Lms\Quiz;
use App\Models\Lms\QuizQuestion;
use App\Models\Lms\QuizAttempt;
use App\Models\Lms\QuizQuestionAttempt;
use App\Models\Lms\Enrollment;
use App\Models\Lms\Certificate;
use App\Models\Lms\CourseUserGroup;
use App\Models\Lms\LessonProgress;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Lms\ContentView;
use App\Models\Lms\CourseSurprise;
use App\Models\Lms\SurpriseReward;
use App\Models\Lms\UserSurpriseAttempt;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LMSController extends Controller
{
    /**
     * Check if LMS tables exist
     */
    private function checkLMSTables(): bool
    {
        return Schema::hasTable('lms_courses');
    }

    // ==================== USERS & ROLES ====================

    /**
     * Get all users and roles for course access control
     */
    public function getUsersAndRoles(Request $request)
    {
        try {
            // Get all users
            $users = DB::table('users')
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get();

            // Get all roles
            $roles = [];
            if (Schema::hasTable('roles')) {
                $roles = DB::table('roles')
                    ->select('id', 'name', 'name as display_name')
                    ->orderBy('name')
                    ->get()
                    ->map(function ($role) {
                        // Create display name from role name
                        $displayNames = [
                            'admin' => 'Administrator',
                            'manager' => 'Manager',
                            'employee' => 'Zaposlenik',
                            'user' => 'Korisnik',
                        ];
                        $role->display_name = $displayNames[$role->name] ?? ucfirst($role->name);
                        return $role;
                    });
            } else {
                // Fallback roles if table doesn't exist
                $roles = collect([
                    (object)['id' => 1, 'name' => 'admin', 'display_name' => 'Administrator'],
                    (object)['id' => 2, 'name' => 'manager', 'display_name' => 'Manager'],
                    (object)['id' => 3, 'name' => 'employee', 'display_name' => 'Zaposlenik'],
                    (object)['id' => 4, 'name' => 'user', 'display_name' => 'Korisnik'],
                ]);
            }

            return response()->json([
                'users' => $users,
                'roles' => $roles,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get users and roles', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to load users and roles',
                'users' => [],
                'roles' => [],
            ], 500);
        }
    }

    // ==================== COURSES ====================

    /**
     * Get all courses (with filtering and user access)
     */
    public function index(Request $request)
    {
        try {
            // Check if tables exist
            if (!$this->checkLMSTables()) {
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 15,
                    'total' => 0,
                ]);
            }

            $user = $request->user();
            
            // Build basic query using DB facade for safety
            $query = DB::table('lms_courses');
            
            // Filter out soft-deleted courses
            if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                $query->whereNull('lms_courses.deleted_at');
            }
            
            // Try to join with users table if it exists and instructor_id column exists
            try {
                if (Schema::hasTable('users') && Schema::hasColumn('lms_courses', 'instructor_id')) {
                    $query->leftJoin('users', 'lms_courses.instructor_id', '=', 'users.id')
                        ->select(
                            'lms_courses.*',
                            'users.name as instructor_name',
                            'users.email as instructor_email'
                        );
                } else {
                    $query->select('lms_courses.*');
                }
            } catch (\Exception $e) {
                Log::warning('LMS: Failed to join users table', ['error' => $e->getMessage()]);
                $query->select('lms_courses.*');
            }

            // Filter by category (only if column exists)
            if ($request->has('category') && $request->input('category') && Schema::hasColumn('lms_courses', 'category')) {
                $query->where('category', $request->input('category'));
            }

            // Filter by level (only if column exists)
            if ($request->has('level') && $request->input('level') && Schema::hasColumn('lms_courses', 'level')) {
                $query->where('level', $request->input('level'));
            }

            // Filter by published status (only if column exists)
            if (Schema::hasColumn('lms_courses', 'is_published')) {
                if ($request->has('published')) {
                    $query->where('lms_courses.is_published', $request->boolean('published'));
                } else {
                    // Default: show published only for regular users
                    // Admins and managers can see all courses
                    try {
                        $isAdminOrManager = false;
                        if ($user && method_exists($user, 'hasRole')) {
                            try {
                                $isAdminOrManager = $user->hasRole('admin') || $user->hasRole('manager');
                            } catch (\Exception $e) {
                                // If role check fails, treat as regular user
                            }
                        }
                        
                        if (!$isAdminOrManager) {
                            $query->where('lms_courses.is_published', true);
                        }
                    } catch (\Exception $e) {
                        // If role check fails, show only published
                        $query->where('lms_courses.is_published', true);
                    }
                }
            }

            // Order by created_at (only if column exists)
            if (Schema::hasColumn('lms_courses', 'created_at')) {
                $query->orderBy('lms_courses.created_at', 'desc');
            } else if (Schema::hasColumn('lms_courses', 'id')) {
                $query->orderBy('lms_courses.id', 'desc');
            }

            // Get total count
            try {
                $total = (clone $query)->count();
            } catch (\Exception $e) {
                Log::error('LMS: Failed to count courses', ['error' => $e->getMessage()]);
                $total = 0;
            }
            
            // Paginate manually
            $perPage = 15;
            $page = $request->input('page', 1);
            $offset = ($page - 1) * $perPage;
            
            try {
                $courses = $query->offset($offset)->limit($perPage)->get();
            } catch (\Exception $e) {
                Log::error('LMS: Failed to fetch courses', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Return empty result on error
                return response()->json([
                    'data' => [],
                    'current_page' => (int)$page,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                    'error' => config('app.debug') ? $e->getMessage() : 'Failed to load courses'
                ], 500);
            }
            
            // Convert to array if needed
            $courses = $courses->map(function ($course) {
                return (array) $course;
            });
            
            // Filter courses by user_groups for regular users (if table exists)
            if ($user && Schema::hasTable('lms_course_user_groups')) {
                try {
                    $isAdminOrManager = false;
                    if (method_exists($user, 'hasRole')) {
                        try {
                            $isAdminOrManager = $user->hasRole('admin') || $user->hasRole('manager');
                        } catch (\Exception $e) {
                            // If role check fails, treat as regular user
                        }
                    }
                    
                    if (!$isAdminOrManager) {
                        // Get user roles
                        $userRoles = [];
                        if (method_exists($user, 'getRoleNames')) {
                            try {
                                $userRoles = $user->getRoleNames()->toArray();
                            } catch (\Exception $e) {
                                Log::warning('LMS: Failed to get user roles', ['error' => $e->getMessage()]);
                            }
                        }
                        
                        // Filter courses based on user_groups
                        $filteredCourses = $courses->filter(function ($course) use ($userRoles, $user) {
                            try {
                                // Ensure course is an object/array and has id
                                $courseId = is_object($course) ? ($course->id ?? $course->course_id ?? null) : ($course['id'] ?? $course['course_id'] ?? null);
                                
                                if (!$courseId) {
                                    // If no ID, allow access
                                    return true;
                                }
                                
                                // Get user groups for this course
                                $courseGroups = DB::table('lms_course_user_groups')
                                    ->where('course_id', $courseId)
                                    ->get();

                                // If no groups defined, course is accessible to all
                                if ($courseGroups->isEmpty()) {
                                    return true;
                                }
                                
                                // Check if user's role matches any group
                                $hasRoleAccess = $courseGroups
                                    ->where('group_type', 'role')
                                    ->whereIn('group_value', $userRoles)
                                    ->isNotEmpty();
                                
                                // Check if user is individually assigned
                                $hasUserAccess = $courseGroups
                                    ->where('group_type', 'user')
                                    ->where('group_value', (string)$user->id)
                                    ->isNotEmpty();
                                
                                return $hasRoleAccess || $hasUserAccess;
                            } catch (\Exception $e) {
                                // If error checking groups, allow access
                                Log::warning('LMS: Failed to check course groups', [
                                    'course' => is_array($course) ? json_encode($course) : (string)$course,
                                    'error' => $e->getMessage()
                                ]);
                                return true;
                            }
                        });
                        
                        $courses = $filteredCourses->values();
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to filter courses by user groups', ['error' => $e->getMessage()]);
                    // Continue with all courses if filtering fails
                }
            }
            
            // Format response to match pagination structure
            // Ensure courses is a collection
            if (!is_object($courses) || !method_exists($courses, 'count')) {
                $courses = collect($courses ?: []);
            }
            
            $coursesCount = $courses->count();
            $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
            
            // Add lessons_count and enrollments_count to each course
            $courses = $courses->map(function ($course) {
                $courseId = is_array($course) ? ($course['id'] ?? null) : ($course->id ?? null);
                
                if ($courseId) {
                    // Count lessons
                    $lessonsCount = 0;
                    if (Schema::hasTable('lms_lessons')) {
                        $query = DB::table('lms_lessons')->where('course_id', $courseId);
                        if (Schema::hasColumn('lms_lessons', 'is_published')) {
                            $query->where('is_published', true);
                        }
                        $lessonsCount = $query->count();
                    }
                    
                    // Count enrollments
                    $enrollmentsCount = 0;
                    if (Schema::hasTable('lms_enrollments')) {
                        $enrollmentsCount = DB::table('lms_enrollments')
                            ->where('course_id', $courseId)
                            ->count();
                    }
                    
                    if (is_array($course)) {
                        $course['lessons_count'] = $lessonsCount;
                        $course['enrollments_count'] = $enrollmentsCount;
                    } else {
                        $course->lessons_count = $lessonsCount;
                        $course->enrollments_count = $enrollmentsCount;
                    }
                }
                
                return $course;
            });
            
            return response()->json([
                'data' => $courses->values()->all(), // Ensure array of objects
                'current_page' => (int)$page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total, // Use original total for pagination
            ]);
        } catch (\Exception $e) {
            Log::error('LMS Index Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            return response()->json([
                'message' => 'Greška pri učitavanju kurseva',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get single course with full details
     */
    public function show(Request $request, $id)
    {
        try {
            // Check if table exists
            if (!Schema::hasTable('lms_courses')) {
                return response()->json([
                    'message' => 'Kurs nije pronađen',
                    'error' => 'Courses table not found'
                ], 404);
            }

            // Load course using DB facade
            $query = DB::table('lms_courses')->where('id', $id);
            
            // Filter out soft-deleted courses
            if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }
            
            $course = $query->first();

            if (!$course) {
                return response()->json([
                    'message' => 'Kurs nije pronađen',
                    'error' => 'Course not found'
                ], 404);
            }
            
            $courseData = (array) $course;
            
            // Load instructor separately (safe - users table always exists)
            try {
                if (isset($courseData['instructor_id']) && $courseData['instructor_id'] && Schema::hasTable('users')) {
                    $instructor = DB::table('users')
                        ->where('id', $courseData['instructor_id'])
                        ->select('id', 'name', 'email')
                        ->first();
                    $courseData['instructor'] = $instructor ? (array) $instructor : null;
                } else {
                    $courseData['instructor'] = null;
                }
            } catch (\Exception $e) {
                Log::warning('LMS: Failed to load instructor', ['error' => $e->getMessage()]);
                $courseData['instructor'] = null;
            }
            
            // Manually load lessons if table exists (avoid Eloquent relationship errors)
            $lessonsData = [];
            if (Schema::hasTable('lms_lessons')) {
                try {
                    $lessonsQuery = DB::table('lms_lessons')
                        ->where('course_id', $id);
                    
                    // Only filter by is_published if column exists
                    if (Schema::hasColumn('lms_lessons', 'is_published')) {
                        $lessonsQuery->where('is_published', true);
                    }
                    
                    // Only order by order if column exists
                    if (Schema::hasColumn('lms_lessons', 'order')) {
                        $lessonsQuery->orderBy('order');
                    }
                    
                    $lessonsData = $lessonsQuery->get()
                        ->map(function ($lesson) {
                            $lessonArray = (array) $lesson;
                            // Decode JSON fields
                            if (isset($lessonArray['additional_files']) && is_string($lessonArray['additional_files'])) {
                                $lessonArray['additional_files'] = json_decode($lessonArray['additional_files'], true);
                            }
                            return $lessonArray;
                        })
                        ->toArray();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load lessons manually', ['error' => $e->getMessage()]);
                }
            }
            $courseData['lessons_data'] = $lessonsData;
            
            // Manually load quizzes if table exists (avoid Eloquent relationship errors)
            $quizzesData = [];
            if (Schema::hasTable('lms_quizzes')) {
                try {
                    $quizzesQuery = DB::table('lms_quizzes')
                        ->where('course_id', $id);
                    
                    // Only filter by is_published if column exists
                    if (Schema::hasColumn('lms_quizzes', 'is_published')) {
                        $quizzesQuery->where('is_published', true);
                    }
                    
                    // Only order by order if column exists
                    if (Schema::hasColumn('lms_quizzes', 'order')) {
                        $quizzesQuery->orderBy('order');
                    }
                    
                    $quizzesData = $quizzesQuery->get()
                        ->map(function ($quiz) {
                            return (array) $quiz;
                        })
                        ->toArray();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load quizzes manually', ['error' => $e->getMessage()]);
                }
            }
            $courseData['quizzes_data'] = $quizzesData;
            
            // Load userGroups if table exists
            $userGroupsData = [];
            if (Schema::hasTable('lms_course_user_groups')) {
                try {
                    $userGroupsData = DB::table('lms_course_user_groups')
                        ->where('course_id', $id)
                        ->get()
                        ->map(function ($group) {
                            return (array) $group;
                        })
                        ->toArray();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load userGroups manually', ['error' => $e->getMessage()]);
                }
            }
            $courseData['user_groups'] = $userGroupsData;

            // Decode JSON fields
            if (isset($courseData['attachments']) && is_string($courseData['attachments'])) {
                $courseData['attachments'] = json_decode($courseData['attachments'], true);
            }

            // Check user access
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role', ['error' => $e->getMessage()]);
                }
            }
            
            if (!$isAdminOrManager) {
                if (!isset($courseData['is_published']) || !$courseData['is_published']) {
                    return response()->json(['message' => 'Course not available'], 403);
                }

                // Check if user has access via groups (using manually loaded data)
                if (!empty($courseData['user_groups'])) {
                    try {
                        $userRoles = [];
                        if (method_exists($user, 'getRoleNames')) {
                            try {
                                $userRoles = $user->getRoleNames()->toArray();
                            } catch (\Exception $e) {
                                Log::warning('LMS: Failed to get user roles', ['error' => $e->getMessage()]);
                            }
                        }
                        
                        // Check if user's role is in the allowed groups
                        $hasRoleAccess = collect($courseData['user_groups'])
                            ->where('group_type', 'role')
                            ->whereIn('group_value', $userRoles)
                            ->isNotEmpty();
                        
                        // Check if user is individually assigned
                        $hasUserAccess = collect($courseData['user_groups'])
                            ->where('group_type', 'user')
                            ->where('group_value', (string)$user->id)
                            ->isNotEmpty();

                        Log::info('LMS: Course access check', [
                            'course_id' => $id,
                            'user_id' => $user->id,
                            'user_roles' => $userRoles,
                            'user_groups' => $courseData['user_groups'],
                            'hasRoleAccess' => $hasRoleAccess,
                            'hasUserAccess' => $hasUserAccess,
                        ]);

                        if (!$hasRoleAccess && !$hasUserAccess) {
                            return response()->json(['message' => 'You do not have access to this course'], 403);
                        }
                    } catch (\Exception $e) {
                        // If groups check fails, allow access (fail open)
                        Log::warning('LMS: Failed to check user access via groups', ['error' => $e->getMessage()]);
                    }
                } else {
                    Log::info('LMS: Course has no user_groups, allowing access', ['course_id' => $id]);
                }
                // If no groups defined, all users have access (no restrictions)
            }

            // Get user's enrollment if exists (only if table exists and user is authenticated)
            if ($user && Schema::hasTable('lms_enrollments')) {
                try {
                    $enrollment = DB::table('lms_enrollments')
                        ->where('course_id', $id)
                        ->where('user_id', $user->id)
                        ->first();
                    $courseData['user_enrollment'] = $enrollment ? (array)$enrollment : null;
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load enrollment', ['error' => $e->getMessage()]);
                    $courseData['user_enrollment'] = null;
                }
            } else {
                $courseData['user_enrollment'] = null;
            }

            // Add manually loaded lessons
            $courseData['lessons'] = $lessonsData;
            
            // Add manually loaded quizzes
            $courseData['quizzes'] = $quizzesData;

            return response()->json($courseData);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('LMS Show Course Not Found: ' . $e->getMessage(), [
                'course_id' => $id,
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Kurs nije pronađen',
                'error' => config('app.debug') ? $e->getMessage() : 'Course not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('LMS Show Course Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'course_id' => $id,
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Greška pri učitavanju kursa',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create course (Manager/Admin only)
     */
    public function store(Request $request)
    {
        try {
            // Check if table exists
            if (!Schema::hasTable('lms_courses')) {
                return response()->json([
                    'message' => 'LMS tabela ne postoji. Molimo pokrenite migracije.',
                    'error' => 'Database table missing'
                ], 500);
            }

            // Check permission
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            
            $isAdminOrManager = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in store', ['error' => $e->getMessage()]);
                }
            }
            
            if (!$isAdminOrManager) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'cover_image' => 'nullable|string|max:255',
                'video_intro_url' => 'nullable|string|max:500', // Changed from url to string to be more flexible
                'category' => 'nullable|string|max:100',
                'level' => 'required|in:beginner,intermediate,advanced',
                'duration' => 'nullable|integer|min:0',
                'is_published' => 'nullable|boolean',
                'is_featured' => 'nullable|boolean',
                'attachments' => 'nullable|array',
                'user_groups' => 'nullable|array', // [{group_type: 'role', group_value: 'employee'}]
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validatedData = $validator->validated();
            
            // Check which columns actually exist in the database
            $existingColumns = Schema::getColumnListing('lms_courses');
            Log::info('LMS: Existing columns in lms_courses', ['columns' => $existingColumns]);
            
            // Prepare data for insertion - only include columns that exist
            $insertData = [];
            
            // Required fields (must exist)
            $insertData['title'] = $validatedData['title'];
            $insertData['level'] = $validatedData['level'];
            $insertData['instructor_id'] = $user->id;
            $insertData['created_by'] = $user->id;
            $insertData['created_at'] = now();
            $insertData['updated_at'] = now();
            
            // Optional fields - only if column exists
            // Handle nullable fields - set to null if empty string, otherwise use value
            if (in_array('description', $existingColumns)) {
                $insertData['description'] = !empty($validatedData['description']) ? $validatedData['description'] : null;
            }
            if (in_array('category', $existingColumns)) {
                $insertData['category'] = !empty($validatedData['category']) ? $validatedData['category'] : null;
            }
            if (in_array('cover_image', $existingColumns)) {
                $insertData['cover_image'] = !empty($validatedData['cover_image']) ? $validatedData['cover_image'] : null;
            }
            if (in_array('video_intro_url', $existingColumns)) {
                $insertData['video_intro_url'] = !empty($validatedData['video_intro_url']) ? $validatedData['video_intro_url'] : null;
            }
            if (in_array('duration', $existingColumns)) {
                $insertData['duration'] = isset($validatedData['duration']) && $validatedData['duration'] !== '' && $validatedData['duration'] !== null 
                    ? (int)$validatedData['duration'] 
                    : null;
            }
            if (in_array('is_published', $existingColumns)) {
                $insertData['is_published'] = isset($validatedData['is_published']) ? (bool)$validatedData['is_published'] : false;
            }
            if (in_array('is_featured', $existingColumns)) {
                $insertData['is_featured'] = isset($validatedData['is_featured']) ? (bool)$validatedData['is_featured'] : false;
            }
            if (in_array('attachments', $existingColumns)) {
                if (!empty($validatedData['attachments']) && is_array($validatedData['attachments'])) {
                    $insertData['attachments'] = json_encode($validatedData['attachments']);
                } else {
                    $insertData['attachments'] = null;
                }
            }

            DB::beginTransaction();
            try {
                // Log what we're trying to create
                Log::info('LMS: Attempting to create course', [
                    'data' => $insertData,
                    'existing_columns' => $existingColumns
                ]);
                
                // Use DB facade to insert directly, avoiding fillable issues
                $courseId = DB::table('lms_courses')->insertGetId($insertData);
                
                Log::info('LMS: Course created successfully', ['course_id' => $courseId]);

                // Attach user groups if provided and table exists
                $validatedUserGroups = $validatedData['user_groups'] ?? [];
                if (!empty($validatedUserGroups) && is_array($validatedUserGroups) && Schema::hasTable('lms_course_user_groups')) {
                    foreach ($validatedUserGroups as $group) {
                        if (!empty($group['group_value'])) {
                            try {
                                DB::table('lms_course_user_groups')->insert([
                                    'course_id' => $courseId,
                                    'group_type' => $group['group_type'] ?? 'role',
                                    'group_value' => $group['group_value'],
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            } catch (\Exception $groupError) {
                                Log::warning('LMS: Failed to create user group', [
                                    'error' => $groupError->getMessage(),
                                    'group' => $group
                                ]);
                                // Continue even if group creation fails
                            }
                        }
                    }
                }

                DB::commit();

                // Prepare response data - get fresh course data
                $courseResponse = DB::table('lms_courses')
                    ->leftJoin('users', 'lms_courses.instructor_id', '=', 'users.id')
                    ->select(
                        'lms_courses.*',
                        'users.name as instructor_name',
                        'users.email as instructor_email'
                    )
                    ->where('lms_courses.id', $courseId)
                    ->first();
                
                if (!$courseResponse) {
                    throw new \Exception('Failed to retrieve created course');
                }
                
                // Convert to array
                $courseData = (array) $courseResponse;
                
                // Decode JSON fields
                if (isset($courseData['attachments']) && is_string($courseData['attachments'])) {
                    $courseData['attachments'] = json_decode($courseData['attachments'], true);
                }
                
                // Format instructor data
                if (isset($courseData['instructor_name'])) {
                    $courseData['instructor'] = [
                        'id' => $courseData['instructor_id'] ?? null,
                        'name' => $courseData['instructor_name'] ?? null,
                        'email' => $courseData['instructor_email'] ?? null,
                    ];
                    unset($courseData['instructor_name'], $courseData['instructor_email']);
                }
                
                // Add userGroups only if table exists
                if (Schema::hasTable('lms_course_user_groups')) {
                    try {
                        $userGroups = DB::table('lms_course_user_groups')
                            ->where('course_id', $courseId)
                            ->get()
                            ->map(function ($group) {
                                return [
                                    'id' => $group->id,
                                    'group_type' => $group->group_type,
                                    'group_value' => $group->group_value,
                                ];
                            });
                        $courseData['user_groups'] = $userGroups->toArray();
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to load userGroups', ['error' => $e->getMessage()]);
                        $courseData['user_groups'] = [];
                    }
                } else {
                    $courseData['user_groups'] = [];
                }

                return response()->json($courseData, 201);
            } catch (\Illuminate\Database\QueryException $e) {
                DB::rollBack();
                $errorMessage = $e->getMessage();
                Log::error('LMS Store Course Database Error', [
                    'message' => $errorMessage,
                    'code' => $e->getCode(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'data' => $insertData
                ]);
                
                // Provide user-friendly error message
                if (str_contains($errorMessage, 'SQLSTATE')) {
                    return response()->json([
                        'message' => 'Greška u bazi podataka. Proverite da li su migracije pokrenute.',
                        'error' => config('app.debug') ? $errorMessage : 'Database error'
                    ], 500);
                }
                
                return response()->json([
                    'message' => 'Greška pri čuvanju kursa',
                    'error' => config('app.debug') ? $errorMessage : 'Internal server error'
                ], 500);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('LMS Store Course Error: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'data' => $insertData
                ]);
                
                return response()->json([
                    'message' => 'Greška pri čuvanju kursa',
                    'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('LMS Store Course Fatal Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            return response()->json([
                'message' => 'Greška na serveru. Pokušajte ponovo.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update course (Manager/Admin only)
     */
    public function update(Request $request, $id)
    {
        try {
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Courses table not found'], 500);
            }

            $course = DB::table('lms_courses')->where('id', $id)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check permission
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in update', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager && $course->instructor_id != $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'cover_image' => 'nullable|string|max:255',
                'video_intro_url' => 'nullable|string|max:500',
                'category' => 'nullable|string|max:100',
                'level' => 'sometimes|in:beginner,intermediate,advanced',
                'duration' => 'nullable|integer|min:0',
                'is_published' => 'boolean',
                'is_featured' => 'boolean',
                'attachments' => 'nullable|array',
                'user_groups' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            
            // Get existing columns
            $existingColumns = Schema::getColumnListing('lms_courses');
            $updateData = [];
            
            foreach ($data as $key => $value) {
                if (in_array($key, $existingColumns)) {
                    // Handle JSON fields
                    if ($key === 'attachments' && is_array($value)) {
                        $updateData[$key] = json_encode($value);
                    } elseif ($value === null || $value === '') {
                        // Skip empty strings for optional fields
                        if (in_array($key, ['description', 'cover_image', 'video_intro_url', 'category', 'duration', 'attachments'])) {
                            continue;
                        }
                        $updateData[$key] = null;
                    } else {
                        $updateData[$key] = $value;
                    }
                }
            }
            
            if (Schema::hasColumn('lms_courses', 'updated_at')) {
                $updateData['updated_at'] = now();
            }

            DB::beginTransaction();
            try {
                DB::table('lms_courses')->where('id', $id)->update($updateData);

                // Update user groups only if table exists
                if (isset($data['user_groups']) && Schema::hasTable('lms_course_user_groups')) {
                    try {
                        DB::table('lms_course_user_groups')->where('course_id', $id)->delete();
                        foreach ($data['user_groups'] as $group) {
                            if (!empty($group['group_value'])) {
                                $groupData = [
                                    'course_id' => $id,
                                    'group_type' => $group['group_type'] ?? 'role',
                                    'group_value' => $group['group_value'],
                                ];
                                
                                if (Schema::hasColumn('lms_course_user_groups', 'created_at')) {
                                    $groupData['created_at'] = now();
                                }
                                if (Schema::hasColumn('lms_course_user_groups', 'updated_at')) {
                                    $groupData['updated_at'] = now();
                                }
                                
                                DB::table('lms_course_user_groups')->insert($groupData);
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to update user groups', ['error' => $e->getMessage()]);
                    }
                }

                DB::commit();

                // Load updated course
                $updatedCourse = DB::table('lms_courses')->where('id', $id)->first();
                $courseData = (array) $updatedCourse;
                
                // Decode JSON fields
                if (isset($courseData['attachments']) && is_string($courseData['attachments'])) {
                    $courseData['attachments'] = json_decode($courseData['attachments'], true);
                }

                // Load user groups if table exists
                if (Schema::hasTable('lms_course_user_groups')) {
                    try {
                        $userGroups = DB::table('lms_course_user_groups')
                            ->where('course_id', $id)
                            ->get();
                        $courseData['user_groups'] = $userGroups->map(function ($group) {
                            return (array) $group;
                        })->toArray();
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to load userGroups', ['error' => $e->getMessage()]);
                        $courseData['user_groups'] = [];
                    }
                }

                return response()->json($courseData);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update course', [
                'error' => $e->getMessage(),
                'course_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri ažuriranju kursa',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Delete course (Manager/Admin only)
     */
    public function destroy(Request $request, $id)
    {
        try {
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Courses table not found'], 500);
            }

            $course = DB::table('lms_courses')->where('id', $id)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check permission
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in destroy', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager && $course->instructor_id != $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            DB::beginTransaction();
            try {
                // Check if soft deletes are enabled (deleted_at column exists)
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    DB::table('lms_courses')->where('id', $id)->update(['deleted_at' => now()]);
                } else {
                    DB::table('lms_courses')->where('id', $id)->delete();
                }

                DB::commit();
                return response()->json(['message' => 'Course deleted successfully']);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete course', [
                'error' => $e->getMessage(),
                'course_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri brisanju kursa',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get my enrolled courses
     */
    public function myEnrollments(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            $userId = $user->id;

            // Check if enrollment table exists
            if (!Schema::hasTable('lms_enrollments')) {
                return response()->json([]);
            }

            // Load enrollments using DB facade - join with courses to filter deleted ones
            $enrollmentsQuery = DB::table('lms_enrollments')
                ->select('lms_enrollments.*')
                ->where('lms_enrollments.user_id', $userId);

            // Join with courses table if it exists to filter deleted courses
            if (Schema::hasTable('lms_courses')) {
                $enrollmentsQuery->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id');
                
                // Filter out enrollments for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $enrollmentsQuery->whereNull('lms_courses.deleted_at');
                }
            }

            // Check if enrolled_at column exists before ordering
            if (Schema::hasColumn('lms_enrollments', 'enrolled_at')) {
                $enrollmentsQuery->orderBy('lms_enrollments.enrolled_at', 'desc');
            }

            $enrollmentsData = $enrollmentsQuery->get();

            // Manually load course and instructor data for each enrollment
            $enrollments = [];
            foreach ($enrollmentsData as $enrollment) {
                $enrollmentArray = (array) $enrollment;

                // Load course if courses table exists (should already be joined, but double-check)
                if (Schema::hasTable('lms_courses')) {
                    $course = DB::table('lms_courses')
                        ->where('id', $enrollment->course_id)
                        ->first();

                    // Skip if course is deleted (double check)
                    if ($course) {
                        if (Schema::hasColumn('lms_courses', 'deleted_at') && isset($course->deleted_at) && $course->deleted_at) {
                            continue; // Skip deleted courses
                        }
                        
                        $courseData = (array) $course;

                        // Load instructor if instructor_id exists
                        if (isset($course->instructor_id) && Schema::hasTable('users')) {
                            try {
                                $instructor = DB::table('users')
                                    ->where('id', $course->instructor_id)
                                    ->select('id', 'name', 'email')
                                    ->first();

                                if ($instructor) {
                                    $courseData['instructor'] = (array) $instructor;
                                }
                            } catch (\Exception $e) {
                                Log::warning('LMS: Failed to load instructor', [
                                    'error' => $e->getMessage(),
                                    'instructor_id' => $course->instructor_id
                                ]);
                            }
                        }

                        $enrollmentArray['course'] = $courseData;
                    }
                }

                // Ensure boolean fields are properly cast
                if (isset($enrollmentArray['recommend_retake'])) {
                    $enrollmentArray['recommend_retake'] = (bool) $enrollmentArray['recommend_retake'];
                }

                // Ensure progress is an integer
                if (isset($enrollmentArray['progress'])) {
                    $enrollmentArray['progress'] = (int) $enrollmentArray['progress'];
                }

                $enrollments[] = $enrollmentArray;
            }

            return response()->json($enrollments);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load enrollments', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);

            return response()->json([
                'message' => 'Greška pri učitavanju kurseva',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Enroll in course
     */
    public function enroll(Request $request, $courseId)
    {
        try {
            // Check if enrollment table exists
            if (!Schema::hasTable('lms_enrollments')) {
                return response()->json([
                    'message' => 'Funkcija upisivanja nije dostupna. Tabela ne postoji.',
                    'error' => 'Enrollment table missing'
                ], 503);
            }

            // Check if courses table exists
            if (!Schema::hasTable('lms_courses')) {
                return response()->json([
                    'message' => 'Kurs nije pronađen',
                    'error' => 'Courses table missing'
                ], 404);
            }

            // Load course using DB facade to avoid relationship issues
            $course = DB::table('lms_courses')->where('id', $courseId)->first();
            
            if (!$course) {
                return response()->json([
                    'message' => 'Kurs nije pronađen',
                    'error' => 'Course not found'
                ], 404);
            }

            $userId = $request->user()->id;
            $user = $request->user();

            // Check if user is admin or manager
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in enroll', ['error' => $e->getMessage()]);
                }
            }

            // Check if course is published (only if column exists)
            if (Schema::hasColumn('lms_courses', 'is_published')) {
                $isPublished = (bool)($course->is_published ?? false);
                if (!$isPublished && !$isAdminOrManager) {
                    return response()->json(['message' => 'Kurs nije dostupan'], 403);
                }
            }

            // Check access via groups
            if (!$isAdminOrManager && Schema::hasTable('lms_course_user_groups')) {
                try {
                    $courseGroups = DB::table('lms_course_user_groups')
                        ->where('course_id', $courseId)
                        ->get();

                    // If groups are defined, check access
                    if ($courseGroups->isNotEmpty()) {
                        $userRoles = [];
                        if (method_exists($user, 'getRoleNames')) {
                            try {
                                $userRoles = $user->getRoleNames()->toArray();
                            } catch (\Exception $e) {
                                Log::warning('LMS: Failed to get user roles in enroll', ['error' => $e->getMessage()]);
                            }
                        }
                        
                        // Check if user's role is in the allowed groups
                        $hasRoleAccess = $courseGroups
                            ->where('group_type', 'role')
                            ->whereIn('group_value', $userRoles)
                            ->isNotEmpty();
                        
                        // Check if user is individually assigned
                        $hasUserAccess = $courseGroups
                            ->where('group_type', 'user')
                            ->where('group_value', (string)$userId)
                            ->isNotEmpty();

                        if (!$hasRoleAccess && !$hasUserAccess) {
                            return response()->json(['message' => 'Nemate pristup ovom kursu'], 403);
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user groups in enroll', ['error' => $e->getMessage()]);
                    // Continue if groups check fails - allow enrollment
                }
            }

            // Check if already enrolled
            $existing = DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->first();

            if ($existing) {
                return response()->json(['message' => 'Već ste upisani u ovaj kurs'], 422);
            }

            // Prepare enrollment data - only include columns that exist in the table
            $enrollmentData = [
                'course_id' => $courseId,
                'user_id' => $userId,
                'enrolled_at' => now(),
                'progress' => 0,
            ];
            
            // Add optional columns if they exist
            if (Schema::hasColumn('lms_enrollments', 'min_passing_score')) {
                $enrollmentData['min_passing_score'] = 70;
            }
            
            // Only add timestamps if columns exist (they don't by default in lms_enrollments)
            if (Schema::hasColumn('lms_enrollments', 'created_at')) {
                $enrollmentData['created_at'] = now();
            }
            if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                $enrollmentData['updated_at'] = now();
            }

            // Insert enrollment
            try {
                $enrollmentId = DB::table('lms_enrollments')->insertGetId($enrollmentData);
            } catch (\Exception $e) {
                Log::error('LMS: Failed to create enrollment', [
                    'error' => $e->getMessage(),
                    'course_id' => $courseId,
                    'user_id' => $userId,
                    'data' => $enrollmentData,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'message' => 'Greška pri upisivanju u kurs',
                    'error' => config('app.debug') ? $e->getMessage() : 'Database error'
                ], 500);
            }
            
            // Load enrollment with course info
            $enrollment = DB::table('lms_enrollments')
                ->leftJoin('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                ->select('lms_enrollments.*', 'lms_courses.title as course_title')
                ->where('lms_enrollments.id', $enrollmentId)
                ->first();

            return response()->json($enrollment, 201);
        } catch (\Exception $e) {
            Log::error('LMS: Enrollment error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'course_id' => $courseId,
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Greška na serveru. Pokušajte ponovo.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ==================== LESSONS ====================

    /**
     * Get course lessons
     */
    public function getLessons(Request $request, $courseId)
    {
        try {
            // Check if tables exist
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Load course
            $query = DB::table('lms_courses')->where('id', $courseId);
            
            // Filter out soft-deleted courses
            if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }
            
            $course = $query->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }
        
            // Check access - allow viewing if course is published, enrollment not required for viewing
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in getLessons', ['error' => $e->getMessage()]);
                }
            }
        
            if (!$isAdminOrManager && (!isset($course->is_published) || !$course->is_published)) {
                return response()->json(['message' => 'Course not available'], 403);
            }

            // Check if lessons table exists
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json([]);
            }

            try {
                $lessonsQuery = DB::table('lms_lessons')
                    ->where('course_id', $courseId);
                
                // Only filter by is_published/is_preview if column exists
                // Note: is_preview means NOT published, so we filter by is_preview = false OR show all for admins
                if (!$isAdminOrManager) {
                    if (Schema::hasColumn('lms_lessons', 'is_published')) {
                        $lessonsQuery->where('is_published', true);
                    } elseif (Schema::hasColumn('lms_lessons', 'is_preview')) {
                        // is_preview = false means the lesson IS published
                        $lessonsQuery->where(function($q) {
                            $q->where('is_preview', false)
                              ->orWhereNull('is_preview');
                        });
                    }
                }
                
                // Only order by order if column exists
                if (Schema::hasColumn('lms_lessons', 'order')) {
                    $lessonsQuery->orderBy('order');
                }
                
                $lessons = $lessonsQuery->get()->map(function ($lesson) use ($user, $isAdminOrManager) {
                    $lessonData = (array) $lesson;
                    
                    // Map is_preview to is_published for frontend compatibility
                    if (isset($lessonData['is_preview'])) {
                        $lessonData['is_published'] = !$lessonData['is_preview'];
                    }
                    
                    // Map duration_minutes to duration for frontend compatibility
                    if (isset($lessonData['duration_minutes'])) {
                        $lessonData['duration'] = $lessonData['duration_minutes'];
                    }
                    
                    // Add progress info for user if enrolled (not required for viewing)
                    if ($user && !$isAdminOrManager && Schema::hasTable('lms_lesson_progress')) {
                        try {
                            $progress = DB::table('lms_lesson_progress')
                                ->where('lesson_id', $lesson->id)
                                ->where('user_id', $user->id)
                                ->first();
                            
                            if ($progress) {
                                $lessonData['user_progress'] = [
                                    'completed_at' => $progress->completed_at,
                                    'is_completed' => $progress->completed_at !== null,
                                ];
                            } else {
                                $lessonData['user_progress'] = null;
                            }
                        } catch (\Exception $e) {
                            $lessonData['user_progress'] = null;
                        }
                    }
                    
                    return $lessonData;
                });

                return response()->json($lessons);
            } catch (\Exception $e) {
                Log::error('LMS: Failed to load lessons', [
                    'error' => $e->getMessage(),
                    'course_id' => $courseId,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([]);
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load lessons (outer)', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([]);
        }
    }

    /**
     * Get single lesson
     */
    public function getLesson(Request $request, $courseId, $lessonId)
    {
        try {
            // Check if lessons table exists
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json(['message' => 'Lesson not found'], 404);
            }

            // Load course for access check
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Course not found'], 404);
            }
            
            $course = DB::table('lms_courses')->where('id', $courseId)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check access - allow viewing if course is published, enrollment NOT required for viewing
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in getLesson', ['error' => $e->getMessage()]);
                }
            }
            
            if (!$isAdminOrManager && (!isset($course->is_published) || !$course->is_published)) {
                return response()->json(['message' => 'Course not available'], 403);
            }

            // Load lesson using DB facade
            $lesson = DB::table('lms_lessons')
                ->where('course_id', $courseId)
                ->where('id', $lessonId)
                ->first();
            
            if (!$lesson) {
                return response()->json(['message' => 'Lesson not found'], 404);
            }
            
            $lessonData = (array) $lesson;
            
            // Map is_preview to is_published for frontend compatibility
            if (isset($lessonData['is_preview'])) {
                $lessonData['is_published'] = !$lessonData['is_preview'];
            }
            
            // Map duration_minutes to duration for frontend compatibility
            if (isset($lessonData['duration_minutes'])) {
                $lessonData['duration'] = $lessonData['duration_minutes'];
            }
            
            // Enrollment is NOT required for viewing lesson
            // Enrollment will be required only for completing the lesson
            
            // Track content view if table exists and user is authenticated
            if ($user && !$isAdminOrManager && Schema::hasTable('lms_content_views')) {
                try {
                    DB::table('lms_content_views')->updateOrInsert(
                        [
                            'user_id' => $user->id,
                            'course_id' => $courseId,
                            'content_type' => 'lesson',
                            'content_id' => $lessonId,
                        ],
                        [
                            'viewed_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to track content view', ['error' => $e->getMessage()]);
                }
            }

            // Get user progress if table exists
            if ($user && Schema::hasTable('lms_lesson_progress')) {
                try {
                    $progress = DB::table('lms_lesson_progress')
                        ->where('lesson_id', $lessonId)
                        ->where('user_id', $user->id)
                        ->first();
                    
                    if ($progress) {
                        $lessonData['user_progress'] = [
                            'is_completed' => !empty($progress->completed_at),
                            'completed_at' => $progress->completed_at,
                        ];
                    } else {
                        $lessonData['user_progress'] = null;
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load lesson progress', ['error' => $e->getMessage()]);
                    $lessonData['user_progress'] = null;
                }
            } else {
                $lessonData['user_progress'] = null;
            }

            // Load attachments if table exists
            if (Schema::hasTable('lms_lesson_attachments')) {
                try {
                    $attachments = DB::table('lms_lesson_attachments')
                        ->where('lesson_id', $lessonId)
                        ->get();
                    
                    $lessonData['attachments'] = $attachments->map(function ($attachment) {
                        return (array) $attachment;
                    })->toArray();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load lesson attachments', ['error' => $e->getMessage()]);
                    $lessonData['attachments'] = [];
                }
            } else {
                // Try to get from additional_files JSON field
                if (isset($lessonData['additional_files']) && $lessonData['additional_files']) {
                    try {
                        $files = is_string($lessonData['additional_files']) 
                            ? json_decode($lessonData['additional_files'], true)
                            : $lessonData['additional_files'];
                        
                        if (is_array($files)) {
                            $lessonData['attachments'] = array_map(function ($file) {
                                return [
                                    'file_name' => is_string($file) ? basename($file) : ($file['file_name'] ?? 'File'),
                                    'file_path' => is_string($file) ? $file : ($file['file_path'] ?? $file),
                                ];
                            }, $files);
                        } else {
                            $lessonData['attachments'] = [];
                        }
                    } catch (\Exception $e) {
                        $lessonData['attachments'] = [];
                    }
                } else {
                    $lessonData['attachments'] = [];
                }
            }

            // Decode JSON fields
            if (isset($lessonData['additional_files'])) {
                if (is_string($lessonData['additional_files'])) {
                    try {
                        $originalString = $lessonData['additional_files'];
                        $decoded = json_decode($originalString, true);
                        $lessonData['additional_files'] = $decoded ?? [];
                        Log::info('LMS: getLesson additional_files decoded from JSON', [
                            'original_string_preview' => substr($originalString, 0, 100),
                            'decoded_count' => is_array($decoded) ? count($decoded) : 0,
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to decode additional_files JSON', ['error' => $e->getMessage()]);
                        $lessonData['additional_files'] = [];
                    }
                } elseif (is_array($lessonData['additional_files'])) {
                    Log::info('LMS: getLesson additional_files already array', [
                        'count' => count($lessonData['additional_files']),
                    ]);
                } else {
                    Log::warning('LMS: getLesson additional_files is neither string nor array', [
                        'type' => gettype($lessonData['additional_files']),
                    ]);
                    $lessonData['additional_files'] = [];
                }
            } else {
                Log::info('LMS: getLesson additional_files not set in database');
                $lessonData['additional_files'] = [];
            }
            
            // Ensure image_url is returned if it exists
            if (isset($lessonData['image_url']) && $lessonData['image_url']) {
                // If it's a storage path, convert to full URL
                if (strpos($lessonData['image_url'], 'storage/') === 0) {
                    $lessonData['image_url'] = asset('/' . $lessonData['image_url']);
                } elseif (strpos($lessonData['image_url'], '/storage/') === 0) {
                    $lessonData['image_url'] = asset($lessonData['image_url']);
                } elseif (!str_starts_with($lessonData['image_url'], 'http')) {
                    // If it's a relative path, assume it's in storage
                    $lessonData['image_url'] = asset('storage/' . ltrim($lessonData['image_url'], '/'));
                }
                Log::info('LMS: getLesson image_url processed', ['original' => $lesson->image_url ?? null, 'processed' => $lessonData['image_url']]);
            }
            
            // Convert additional_files URLs to full URLs if needed
            if (isset($lessonData['additional_files']) && is_array($lessonData['additional_files'])) {
                $lessonData['additional_files'] = array_map(function($file) {
                    if (is_string($file)) {
                        // If it's already a full URL, return as is
                        if (str_starts_with($file, 'http://') || str_starts_with($file, 'https://')) {
                            return $file;
                        }
                        // If it's a storage path, convert to full URL
                        if (strpos($file, 'storage/') === 0) {
                            return asset('/' . $file);
                        } elseif (strpos($file, '/storage/') === 0) {
                            return asset($file);
                        } else {
                            // Assume it's a relative path in storage
                            return asset('storage/' . ltrim($file, '/'));
                        }
                    }
                    return $file;
                }, $lessonData['additional_files']);
                Log::info('LMS: getLesson additional_files processed', ['count' => count($lessonData['additional_files']), 'files' => $lessonData['additional_files']]);
            }
            
            // Also convert attachments file_path to full URLs
            if (isset($lessonData['attachments']) && is_array($lessonData['attachments'])) {
                $lessonData['attachments'] = array_map(function($attachment) {
                    if (isset($attachment['file_path'])) {
                        $filePath = $attachment['file_path'];
                        // If it's a storage path, convert to full URL
                        if (strpos($filePath, 'storage/') === 0 || strpos($filePath, '/storage/') === 0) {
                            $attachment['file_path'] = asset($filePath);
                        } else if (!str_starts_with($filePath, 'http')) {
                            $attachment['file_path'] = asset('storage/' . $filePath);
                        }
                    }
                    return $attachment;
                }, $lessonData['attachments']);
            }

            return response()->json($lessonData);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load lesson', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'lesson_id' => $lessonId
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju lekcije',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create lesson (Manager/Admin only)
     */
    public function storeLesson(Request $request, $courseId)
    {
        try {
            // Check if lessons table exists
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json(['message' => 'Lessons table not found'], 500);
            }

            // Load course
            $course = null;
            if (Schema::hasTable('lms_courses')) {
                $course = DB::table('lms_courses')->where('id', $courseId)->first();
            }
            
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check permission
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized - not logged in'], 403);
            }
            
            $isAdminOrManager = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in storeLesson', ['error' => $e->getMessage()]);
                }
            }
            
            // Also check if user has role property directly
            if (!$isAdminOrManager && isset($user->role)) {
                $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
            }
            
            // Check if user is instructor or admin/manager
            $isInstructor = isset($course->instructor_id) && $course->instructor_id == $user->id;
            
            if (!$isAdminOrManager && !$isInstructor) {
                // For now, allow any authenticated user to add lessons if they have access to the course
                // This can be tightened later based on requirements
                Log::info('LMS: User adding lesson', [
                    'user_id' => $user->id,
                    'course_id' => $courseId,
                    'isAdminOrManager' => $isAdminOrManager,
                    'isInstructor' => $isInstructor
                ]);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'content' => 'nullable|string',
                'video_url' => 'nullable|string|max:500',
                'image_url' => 'nullable|string|max:500',
                'document_url' => 'nullable|string|max:500',
                'duration' => 'nullable|integer|min:0',
                'order' => 'required|integer|min:1',
                'is_published' => 'boolean',
                'is_preview' => 'boolean',
                'type' => 'nullable|string|max:50',
                'additional_files' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $data['course_id'] = $courseId;

            // Get existing columns in lms_lessons table
            $existingColumns = Schema::getColumnListing('lms_lessons');
            
            // Map field names to actual column names
            $columnMappings = [
                'duration' => 'duration_minutes',
                'is_published' => 'is_preview', // Map is_published to is_preview (inverted logic)
            ];
            
            // Filter data to only include existing columns
            $insertData = [];
            Log::info('LMS: Creating lesson', [
                'data_keys' => array_keys($data),
                'image_url' => $data['image_url'] ?? 'NOT SET',
                'additional_files' => isset($data['additional_files']) ? (is_array($data['additional_files']) ? count($data['additional_files']) . ' items' : gettype($data['additional_files'])) : 'NOT SET',
                'existingColumns' => $existingColumns,
            ]);
            
            foreach ($data as $key => $value) {
                // Check for column mapping
                $actualColumn = $columnMappings[$key] ?? $key;
                
                if (in_array($actualColumn, $existingColumns)) {
                    // Handle additional_files specially - it's an array
                    if ($key === 'additional_files') {
                        if (is_array($value) && count($value) > 0) {
                            // Filter out empty strings and keep only valid URLs
                            $filteredFiles = array_filter($value, function($file) {
                                return !empty($file) && is_string($file) && trim($file) !== '';
                            });
                            if (count($filteredFiles) > 0) {
                                $insertData[$actualColumn] = array_values($filteredFiles);
                            }
                        }
                        continue;
                    }
                    
                    // Handle image_url specially - don't skip if it's set (even if empty, we want to allow clearing it)
                    if ($key === 'image_url') {
                        // Always include image_url if it exists in data, even if empty
                        $insertData[$actualColumn] = $value ?? null;
                        continue;
                    }
                    
                    if ($value === null || $value === '') {
                        // Skip empty strings for optional fields
                        if (in_array($actualColumn, ['description', 'content', 'video_url', 'document_url', 'duration_minutes'])) {
                            continue;
                        }
                    }
                    
                    // Handle is_published -> is_preview conversion (inverted)
                    if ($key === 'is_published') {
                        $insertData['is_preview'] = !$value; // Invert: published means NOT preview
                        continue;
                    }
                    
                    $insertData[$actualColumn] = $value;
                } else {
                    Log::warning('LMS: Column does not exist', [
                        'column' => $actualColumn,
                        'key' => $key,
                        'existingColumns' => $existingColumns,
                    ]);
                }
            }
            
            Log::info('LMS: Insert data prepared', [
                'insertData_keys' => array_keys($insertData),
                'image_url' => $insertData['image_url'] ?? 'NOT SET',
                'additional_files' => isset($insertData['additional_files']) ? (is_array($insertData['additional_files']) ? count($insertData['additional_files']) . ' items' : gettype($insertData['additional_files'])) : 'NOT SET',
            ]);
            
            // Ensure 'type' column has a default value if it exists and is required
            if (in_array('type', $existingColumns) && !isset($insertData['type'])) {
                $insertData['type'] = 'text'; // Default lesson type
            }
            
            // Ensure 'is_preview' has a default value
            if (in_array('is_preview', $existingColumns) && !isset($insertData['is_preview'])) {
                $insertData['is_preview'] = false;
            }

            // Ensure timestamps
            if (in_array('created_at', $existingColumns)) {
                $insertData['created_at'] = now();
            }
            if (in_array('updated_at', $existingColumns)) {
                $insertData['updated_at'] = now();
            }

            // Handle JSON columns
            if (isset($insertData['additional_files']) && is_array($insertData['additional_files'])) {
                $fileCount = count($insertData['additional_files']);
                $insertData['additional_files'] = json_encode($insertData['additional_files']);
                Log::info('LMS: additional_files encoded to JSON', [
                    'count' => $fileCount,
                    'json_length' => strlen($insertData['additional_files']),
                ]);
            } else {
                Log::info('LMS: additional_files not set or not array', [
                    'isset' => isset($insertData['additional_files']),
                    'is_array' => isset($insertData['additional_files']) && is_array($insertData['additional_files']),
                ]);
            }

            DB::beginTransaction();
            try {
                $lessonId = DB::table('lms_lessons')->insertGetId($insertData);
                $lesson = DB::table('lms_lessons')->where('id', $lessonId)->first();
                
                // Convert to array for manipulation
                $lessonData = (array) $lesson;
                
                // Decode JSON fields if they exist
                if (isset($lessonData['additional_files']) && $lessonData['additional_files']) {
                    $lessonData['additional_files'] = json_decode($lessonData['additional_files'], true);
                }
                
            // Map database columns to frontend expected names
            if (isset($lessonData['duration_minutes'])) {
                $lessonData['duration'] = $lessonData['duration_minutes'];
            }
            
            // Ensure image_url is returned if it exists
            if (isset($lessonData['image_url']) && $lessonData['image_url']) {
                // If it's a storage path, convert to full URL
                if (strpos($lessonData['image_url'], 'storage/') === 0 || strpos($lessonData['image_url'], '/storage/') === 0) {
                    $lessonData['image_url'] = asset($lessonData['image_url']);
                }
            }
            
            // Ensure additional_files is properly formatted
            if (isset($lessonData['additional_files']) && is_string($lessonData['additional_files'])) {
                $lessonData['additional_files'] = json_decode($lessonData['additional_files'], true) ?? [];
            }
            
            // Convert additional_files URLs to full URLs if needed
            if (isset($lessonData['additional_files']) && is_array($lessonData['additional_files'])) {
                $lessonData['additional_files'] = array_map(function($file) {
                    if (is_string($file)) {
                        // If it's a storage path, convert to full URL
                        if (strpos($file, 'storage/') === 0 || strpos($file, '/storage/') === 0) {
                            return asset($file);
                        }
                        return $file;
                    }
                    return $file;
                }, $lessonData['additional_files']);
            }
                if (isset($lessonData['is_preview'])) {
                    $lessonData['is_published'] = !$lessonData['is_preview'];
                }
                
                DB::commit();
                return response()->json($lessonData, 201);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('LMS: Failed to create lesson', [
                    'error' => $e->getMessage(),
                    'course_id' => $courseId,
                    'data' => $insertData,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'message' => 'Greška pri čuvanju lekcije',
                    'error' => config('app.debug') ? $e->getMessage() : 'Database error'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to store lesson', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri čuvanju lekcije',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update an existing lesson
     */
    public function updateLesson(Request $request, $courseId, $lessonId)
    {
        try {
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json(['message' => 'Lessons table not found'], 500);
            }

            $course = Schema::hasTable('lms_courses')
                ? DB::table('lms_courses')->where('id', $courseId)->first()
                : null;

            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $lesson = DB::table('lms_lessons')
                ->where('id', $lessonId)
                ->where('course_id', $courseId)
                ->first();

            if (!$lesson) {
                return response()->json(['message' => 'Lesson not found'], 404);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $isAdminOrManager = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in updateLesson', ['error' => $e->getMessage()]);
                }
            }
            if (!$isAdminOrManager && isset($user->role)) {
                $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
            }
            $isInstructor = isset($course->instructor_id) && (int) $course->instructor_id === (int) $user->id;
            if (!$isAdminOrManager && !$isInstructor) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'content' => 'nullable|string',
                'video_url' => 'nullable|string|max:500',
                'image_url' => 'nullable|string|max:500',
                'document_url' => 'nullable|string|max:500',
                'duration' => 'nullable|integer|min:0',
                'order' => 'required|integer|min:1',
                'is_published' => 'boolean',
                'is_preview' => 'boolean',
                'type' => 'nullable|string|max:50',
                'additional_files' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $existingColumns = Schema::getColumnListing('lms_lessons');
            $columnMappings = [
                'duration' => 'duration_minutes',
            ];

            $updateData = [];
            foreach ($data as $key => $value) {
                $actualColumn = $columnMappings[$key] ?? $key;

                if ($key === 'is_published') {
                    if (in_array('is_published', $existingColumns)) {
                        $updateData['is_published'] = (bool) $value;
                    }
                    if (in_array('is_preview', $existingColumns)) {
                        $updateData['is_preview'] = !(bool) $value;
                    }
                    continue;
                }

                if ($key === 'additional_files') {
                    if (!in_array('additional_files', $existingColumns)) {
                        continue;
                    }
                    if (is_array($value)) {
                        $filtered = array_values(array_filter($value, function ($file) {
                            return !empty($file) && is_string($file) && trim($file) !== '';
                        }));
                        $updateData['additional_files'] = json_encode($filtered);
                    } else {
                        $updateData['additional_files'] = json_encode([]);
                    }
                    continue;
                }

                if (in_array($actualColumn, $existingColumns)) {
                    $updateData[$actualColumn] = $value;
                }
            }

            if (in_array('updated_at', $existingColumns)) {
                $updateData['updated_at'] = now();
            }

            DB::table('lms_lessons')
                ->where('id', $lessonId)
                ->where('course_id', $courseId)
                ->update($updateData);

            $updated = DB::table('lms_lessons')->where('id', $lessonId)->first();
            $lessonData = (array) $updated;

            if (isset($lessonData['additional_files']) && is_string($lessonData['additional_files'])) {
                $lessonData['additional_files'] = json_decode($lessonData['additional_files'], true) ?? [];
            }
            if (isset($lessonData['duration_minutes'])) {
                $lessonData['duration'] = $lessonData['duration_minutes'];
            }
            if (isset($lessonData['is_preview']) && !isset($lessonData['is_published'])) {
                $lessonData['is_published'] = !$lessonData['is_preview'];
            }

            return response()->json($lessonData);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update lesson', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'lesson_id' => $lessonId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Greška pri ažuriranju lekcije',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Delete a lesson from a course
     */
    public function deleteLesson(Request $request, $courseId, $lessonId)
    {
        try {
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json(['message' => 'Lessons table not found'], 500);
            }

            $course = Schema::hasTable('lms_courses')
                ? DB::table('lms_courses')->where('id', $courseId)->first()
                : null;

            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $lesson = DB::table('lms_lessons')
                ->where('id', $lessonId)
                ->where('course_id', $courseId)
                ->first();

            if (!$lesson) {
                return response()->json(['message' => 'Lesson not found'], 404);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $isAdminOrManager = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in deleteLesson', ['error' => $e->getMessage()]);
                }
            }
            if (!$isAdminOrManager && isset($user->role)) {
                $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
            }

            $isInstructor = isset($course->instructor_id) && (int) $course->instructor_id === (int) $user->id;

            if (!$isAdminOrManager && !$isInstructor) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            DB::beginTransaction();
            try {
                if (Schema::hasTable('lms_lesson_progress')) {
                    DB::table('lms_lesson_progress')->where('lesson_id', $lessonId)->delete();
                }
                if (Schema::hasTable('lms_lesson_attachments')) {
                    DB::table('lms_lesson_attachments')->where('lesson_id', $lessonId)->delete();
                }
                if (Schema::hasTable('lms_video_progress')) {
                    DB::table('lms_video_progress')->where('lesson_id', $lessonId)->delete();
                }

                DB::table('lms_lessons')->where('id', $lessonId)->where('course_id', $courseId)->delete();

                DB::commit();

                return response()->json(['message' => 'Lekcija je uspješno obrisana']);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete lesson', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'lesson_id' => $lessonId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Greška pri brisanju lekcije',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Mark lesson as completed
     */
    public function completeLesson(Request $request, $courseId, $lessonId)
    {
        try {
        $userId = $request->user()->id;

            // Check if tables exist
            if (!Schema::hasTable('lms_lessons')) {
                return response()->json(['message' => 'Lessons table not found'], 500);
            }

            // Load lesson
            $lesson = DB::table('lms_lessons')
                ->where('course_id', $courseId)
                ->where('id', $lessonId)
                ->first();

            if (!$lesson) {
                return response()->json(['message' => 'Lesson not found'], 404);
            }

            // Check enrollment
            if (!Schema::hasTable('lms_enrollments')) {
                return response()->json(['message' => 'Enrollments table not found'], 500);
            }

            $enrollment = DB::table('lms_enrollments')
            ->where('course_id', $courseId)
            ->where('user_id', $userId)
                ->first();

            if (!$enrollment) {
                return response()->json(['message' => 'You must enroll in this course first'], 403);
            }

            // Mark lesson as completed
            if (!Schema::hasTable('lms_lesson_progress')) {
                return response()->json(['message' => 'Lesson progress table not found'], 500);
            }

            DB::table('lms_lesson_progress')->updateOrInsert(
                [
                    'lesson_id' => $lessonId,
                    'user_id' => $userId,
                ],
                [
                    'completed_at' => now(),
                ]
            );

            // Update course progress
            // Get total published lessons
            $totalLessonsQuery = DB::table('lms_lessons')
                ->where('course_id', $courseId);
            
            if (Schema::hasColumn('lms_lessons', 'is_published')) {
                $totalLessonsQuery->where('is_published', true);
            }
            
            $totalLessons = $totalLessonsQuery->count();

            // Get completed lessons
            $completedLessons = DB::table('lms_lesson_progress')
                ->join('lms_lessons', 'lms_lesson_progress.lesson_id', '=', 'lms_lessons.id')
                ->where('lms_lessons.course_id', $courseId)
                ->where('lms_lesson_progress.user_id', $userId)
                ->whereNotNull('lms_lesson_progress.completed_at')
                ->count();

            $courseProgress = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0;

            // Update enrollment progress
            $enrollmentUpdate = ['progress' => $courseProgress];
            if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                $enrollmentUpdate['updated_at'] = now();
            }
            
            DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->update($enrollmentUpdate);

            // Check if course is completed
            $courseCompleted = false;
            if ($courseProgress >= 100 && !$enrollment->completed_at && Schema::hasColumn('lms_enrollments', 'completed_at')) {
                DB::table('lms_enrollments')
                    ->where('course_id', $courseId)
                    ->where('user_id', $userId)
                    ->update(['completed_at' => now()]);
                $courseCompleted = true;
            }

            // Award points for lesson completion
            $this->awardPoints($userId, 10, 'lesson_complete', $lessonId, 'Završena lekcija');
            
            // Award bonus points for course completion
            if ($courseCompleted) {
                $this->awardPoints($userId, 50, 'course_complete', $courseId, 'Završen kurs');
            }
            
            // Update streak
            $this->updateStreak($userId);

            return response()->json([
                'message' => 'Lesson completed',
                'progress' => $courseProgress,
                'completed_lessons' => $completedLessons,
                'total_lessons' => $totalLessons,
                'course_completed' => $courseCompleted,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to complete lesson', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'lesson_id' => $lessonId,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri završavanju lekcije',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ==================== QUIZZES ====================

    /**
     * Get course quizzes
     */
    public function getQuizzes(Request $request, $courseId)
    {
        try {
            // Check if quizzes table exists
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json([]);
            }

            // Load course
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $course = DB::table('lms_courses')->where('id', $courseId)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }
        
            // Check access
            $user = $request->user();
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    if (!$user->hasAnyRole(['admin', 'manager'])) {
                        if (!isset($course->is_published) || !$course->is_published) {
                            return response()->json(['message' => 'Course not available'], 403);
                        }

                        // Enrollment check removed - users can view quizzes without enrollment
                        // Enrollment will be required only for taking the quiz
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user access for quizzes', ['error' => $e->getMessage()]);
                }
            }

            try {
                $quizzesQuery = DB::table('lms_quizzes')
                    ->where('course_id', $courseId);
                
                // Only filter by is_published if column exists
                if (Schema::hasColumn('lms_quizzes', 'is_published')) {
                    $quizzesQuery->where('is_published', true);
                }
                
                // Only order by order if column exists
                if (Schema::hasColumn('lms_quizzes', 'order')) {
                    $quizzesQuery->orderBy('order');
                }
                
                $quizzes = $quizzesQuery->get()->map(function ($quiz) use ($user, $courseId) {
                    $quizData = (array) $quiz;
                    
                    // Add questions count if table exists
                    if (Schema::hasTable('lms_quiz_questions')) {
                        try {
                            $questionsCount = DB::table('lms_quiz_questions')
                                ->where('quiz_id', $quiz->id)
                                ->count();
                            $quizData['questions_count'] = $questionsCount;
                        } catch (\Exception $e) {
                            $quizData['questions_count'] = 0;
                        }
                    } else {
                        $quizData['questions_count'] = 0;
                    }
                    
                    // Add attempt info for user if authenticated
                    if ($user && Schema::hasTable('lms_quiz_attempts')) {
                        try {
                            $attempts = DB::table('lms_quiz_attempts')
                                ->where('quiz_id', $quiz->id)
                                ->where('user_id', $user->id)
                                ->orderBy('created_at', 'desc')
                                ->get();

                            $quizData['user_attempts'] = $attempts->toArray();
                            $quizData['latest_attempt'] = $attempts->first() ? (array) $attempts->first() : null;
                            $quizData['can_retake'] = !$quiz->max_attempts || $attempts->count() < $quiz->max_attempts;
                        } catch (\Exception $e) {
                            $quizData['user_attempts'] = [];
                            $quizData['latest_attempt'] = null;
                            $quizData['can_retake'] = true;
                        }
                    }
                    
                    return $quizData;
                });

                return response()->json($quizzes);
            } catch (\Exception $e) {
                Log::error('LMS: Failed to load quizzes', [
                    'error' => $e->getMessage(),
                    'course_id' => $courseId,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([]);
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load quizzes (outer)', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([]);
        }
    }

    /**
     * Get quiz with questions
     */
    public function getQuiz(Request $request, $courseId, $quizId)
    {
        try {
            // Check if tables exist
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            // Load quiz
            $quiz = DB::table('lms_quizzes')
                ->where('course_id', $courseId)
                ->where('id', $quizId)
                ->first();

            if (!$quiz) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            // Load course
            $course = null;
            if (Schema::hasTable('lms_courses')) {
                $course = DB::table('lms_courses')->where('id', $courseId)->first();
                if (!$course) {
                    return response()->json(['message' => 'Course not found'], 404);
                }
            }

            // Check access
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in getQuiz', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager) {
                // Check if course is published
                if ($course && (!isset($course->is_published) || !$course->is_published)) {
                    return response()->json(['message' => 'Quiz not available'], 403);
                }

                // Check enrollment (required for taking quiz, but not for viewing questions)
                if (Schema::hasTable('lms_enrollments')) {
                    $enrollment = DB::table('lms_enrollments')
                        ->where('course_id', $courseId)
                        ->where('user_id', $user->id)
                        ->first();

                    if (!$enrollment) {
                        return response()->json(['message' => 'You must enroll in this course first'], 403);
                    }
                }

                // Check max attempts
                if (Schema::hasTable('lms_quiz_attempts') && $quiz->max_attempts) {
                    $attemptCount = DB::table('lms_quiz_attempts')
                        ->where('quiz_id', $quizId)
                        ->where('user_id', $user->id)
                        ->count();

                    if ($attemptCount >= $quiz->max_attempts) {
                        return response()->json([
                            'message' => 'Maximum attempts reached',
                            'attempts_used' => $attemptCount,
                            'max_attempts' => $quiz->max_attempts,
                        ], 403);
                    }
                }
            }

            // Load questions
            $questions = [];
            if (Schema::hasTable('lms_quiz_questions')) {
                $questionsQuery = DB::table('lms_quiz_questions')
                    ->where('quiz_id', $quizId);
                
                if (Schema::hasColumn('lms_quiz_questions', 'order')) {
                    $questionsQuery->orderBy('order');
                }
                
                $questionsData = $questionsQuery->get();
                
                foreach ($questionsData as $question) {
                    $questionData = (array) $question;
                    
                    // Decode JSON options
                    if (isset($questionData['options']) && is_string($questionData['options'])) {
                        $questionData['options'] = json_decode($questionData['options'], true);
                    }
                    
                    // Hide correct answer if user is not admin/manager
                    if (!$isAdminOrManager && isset($questionData['correct_answer'])) {
                        unset($questionData['correct_answer']);
                    }
                    
                    $questions[] = $questionData;
                }
            }

            $quizData = (array) $quiz;
            $quizData['questions'] = $questions;
            $quizData['course'] = $course ? (array) $course : null;

            return response()->json($quizData);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'quiz_id' => $quizId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Submit quiz attempt
     */
    public function submitQuiz(Request $request, $courseId, $quizId)
    {
        try {
            // Check if tables exist
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }
            if (!Schema::hasTable('lms_quiz_questions')) {
                return response()->json(['message' => 'Quiz questions table not found'], 500);
            }

            // Load quiz
            $quiz = DB::table('lms_quizzes')
                ->where('course_id', $courseId)
                ->where('id', $quizId)
                ->first();

            if (!$quiz) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            $user = $request->user();

            // Check access
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in submitQuiz', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager) {
                // Check enrollment
                if (!Schema::hasTable('lms_enrollments')) {
                    return response()->json(['message' => 'Enrollments table not found'], 500);
                }

                $enrollment = DB::table('lms_enrollments')
                    ->where('course_id', $courseId)
                    ->where('user_id', $user->id)
                    ->first();

                if (!$enrollment) {
                    return response()->json(['message' => 'You must enroll in this course first'], 403);
                }

                // Check max attempts
                if ($quiz->max_attempts && Schema::hasTable('lms_quiz_attempts')) {
                    $attemptCount = DB::table('lms_quiz_attempts')
                        ->where('quiz_id', $quizId)
                        ->where('user_id', $user->id)
                        ->count();

                    if ($attemptCount >= $quiz->max_attempts) {
                        return response()->json([
                            'message' => 'Maximum attempts reached'
                        ], 403);
                    }
                }
            }

            $validator = Validator::make($request->all(), [
                'answers' => 'required|array',
                'answers.*.question_id' => 'required',
                'answers.*.answer' => 'required',
                'started_at' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Load questions
            $questionsQuery = DB::table('lms_quiz_questions')
                ->where('quiz_id', $quizId);
            
            if (Schema::hasColumn('lms_quiz_questions', 'order')) {
                $questionsQuery->orderBy('order');
            }
            
            $questions = $questionsQuery->get();

            if ($questions->isEmpty()) {
                return response()->json(['message' => 'Quiz has no questions'], 400);
            }

            $answers = $request->input('answers');
            $startedAt = $request->input('started_at') ? new \DateTime($request->input('started_at')) : now();

            // Calculate score
            $totalPoints = 0;
            $earnedPoints = 0;
            $questionResults = [];

            foreach ($questions as $question) {
                $totalPoints += $question->points;
                $userAnswer = collect($answers)->firstWhere('question_id', $question->id);
                
                if (!$userAnswer) {
                    $isCorrect = false;
                    $pointsEarned = 0;
                } else {
                    // Compare answers (normalize for case-insensitive comparison)
                    $correctAnswer = strtolower(trim($question->correct_answer));
                    $submittedAnswer = strtolower(trim($userAnswer['answer']));
                    $isCorrect = $correctAnswer === $submittedAnswer;
                    $pointsEarned = $isCorrect ? $question->points : 0;
                    $earnedPoints += $pointsEarned;
                }

                $questionResults[] = [
                    'question_id' => $question->id,
                    'question' => $question->question,
                    'user_answer' => $userAnswer['answer'] ?? null,
                    'correct_answer' => $question->correct_answer,
                    'is_correct' => $isCorrect,
                    'points_earned' => $pointsEarned,
                    'total_points' => $question->points,
                ];
            }

            $score = $earnedPoints;
            $percentage = $totalPoints > 0 
                ? round(($earnedPoints / $totalPoints) * 100, 2) 
                : 0;
            $passed = $percentage >= $quiz->passing_score;

            // Get enrollment for grade calculation
            $enrollment = null;
            if (Schema::hasTable('lms_enrollments')) {
                $enrollment = DB::table('lms_enrollments')
                    ->where('course_id', $courseId)
                    ->where('user_id', $user->id)
                    ->first();
            }
            
            $minPassingScore = $enrollment && isset($enrollment->min_passing_score) 
                ? $enrollment->min_passing_score 
                : 70;
            $grade = $this->calculateGrade($percentage);
            $recommendRetake = $percentage < $minPassingScore;

            // Create quiz attempt
            if (!Schema::hasTable('lms_quiz_attempts')) {
                return response()->json(['message' => 'Quiz attempts table not found'], 500);
            }

            $attemptNumber = DB::table('lms_quiz_attempts')
                ->where('quiz_id', $quizId)
                ->where('user_id', $user->id)
                ->count() + 1;

            $attemptColumns = Schema::getColumnListing('lms_quiz_attempts');
            $attemptData = [
                'quiz_id' => $quizId,
                'user_id' => $user->id,
                'score' => $score,
                'passed' => $passed,
            ];

            // Add optional columns if they exist
            if (in_array('attempt_number', $attemptColumns)) {
                $attemptData['attempt_number'] = $attemptNumber;
            }
            if (in_array('percentage', $attemptColumns)) {
                $attemptData['percentage'] = $percentage;
            }
            if (in_array('grade', $attemptColumns)) {
                $attemptData['grade'] = $grade;
            }
            if (in_array('recommend_retake', $attemptColumns)) {
                $attemptData['recommend_retake'] = $recommendRetake;
            }
            if (in_array('answers', $attemptColumns)) {
                $attemptData['answers'] = json_encode($answers);
            }
            if (in_array('question_results', $attemptColumns)) {
                $attemptData['question_results'] = json_encode($questionResults);
            }
            if (in_array('started_at', $attemptColumns)) {
                $attemptData['started_at'] = $startedAt;
            }
            if (in_array('completed_at', $attemptColumns)) {
                $attemptData['completed_at'] = now();
            }
            if (in_array('created_at', $attemptColumns)) {
                $attemptData['created_at'] = now();
            }
            if (in_array('updated_at', $attemptColumns)) {
                $attemptData['updated_at'] = now();
            }

            // Filter to only existing columns
            $filteredAttemptData = [];
            foreach ($attemptData as $key => $value) {
                if (in_array($key, $attemptColumns)) {
                    $filteredAttemptData[$key] = $value;
                }
            }

            DB::beginTransaction();
            try {
                $quizAttemptId = DB::table('lms_quiz_attempts')->insertGetId($filteredAttemptData);

                // Create question attempts if table exists
                if (Schema::hasTable('lms_quiz_question_attempts')) {
                    $questionAttemptColumns = Schema::getColumnListing('lms_quiz_question_attempts');
                    
                    foreach ($questionResults as $result) {
                        $questionAttemptData = [
                            'quiz_attempt_id' => $quizAttemptId,
                            'question_id' => $result['question_id'],
                        ];

                        if (in_array('user_answer', $questionAttemptColumns)) {
                            $questionAttemptData['user_answer'] = $result['user_answer'];
                        }
                        if (in_array('is_correct', $questionAttemptColumns)) {
                            $questionAttemptData['is_correct'] = $result['is_correct'];
                        }
                        if (in_array('points_earned', $questionAttemptColumns)) {
                            $questionAttemptData['points_earned'] = $result['points_earned'];
                        }
                        if (in_array('created_at', $questionAttemptColumns)) {
                            $questionAttemptData['created_at'] = now();
                        }
                        if (in_array('updated_at', $questionAttemptColumns)) {
                            $questionAttemptData['updated_at'] = now();
                        }

                        // Filter to only existing columns
                        $filteredQuestionAttemptData = [];
                        foreach ($questionAttemptData as $key => $value) {
                            if (in_array($key, $questionAttemptColumns)) {
                                $filteredQuestionAttemptData[$key] = $value;
                            }
                        }

                        DB::table('lms_quiz_question_attempts')->insert($filteredQuestionAttemptData);
                    }
                }

                // Update enrollment if course completed
                if ($passed && $enrollment && (!isset($enrollment->completed_at) || !$enrollment->completed_at)) {
                    // Check if all quizzes passed (filter deleted quizzes)
                    $allQuizzes = DB::table('lms_quizzes')
                        ->where('course_id', $courseId);
                    
                    // Filter out soft-deleted quizzes
                    if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                        $allQuizzes->whereNull('deleted_at');
                    }
                    
                    if (Schema::hasColumn('lms_quizzes', 'is_published')) {
                        $allQuizzes->where('is_published', true);
                    }
                    
                    $allQuizzes = $allQuizzes->get();
                    
                    $allQuizzesPassed = true;
                    $totalQuizPercentage = 0;

                    foreach ($allQuizzes as $courseQuiz) {
                        $latestAttempt = DB::table('lms_quiz_attempts')
                            ->where('quiz_id', $courseQuiz->id)
                            ->where('user_id', $user->id)
                            ->orderBy('created_at', 'desc')
                            ->first();

                        if (!$latestAttempt || !isset($latestAttempt->passed) || !$latestAttempt->passed) {
                            $allQuizzesPassed = false;
                            break;
                        }

                        if (isset($latestAttempt->percentage)) {
                            $totalQuizPercentage += $latestAttempt->percentage;
                        }
                    }

                    if ($allQuizzesPassed && $allQuizzes->count() > 0) {
                        $avgPercentage = $totalQuizPercentage / $allQuizzes->count();
                        $finalGrade = $this->calculateGrade($avgPercentage);
                        
                        $enrollmentUpdate = [
                            'completed_at' => now(),
                            'progress' => 100,
                        ];

                        if (Schema::hasColumn('lms_enrollments', 'final_score')) {
                            $enrollmentUpdate['final_score'] = $avgPercentage;
                        }
                        if (Schema::hasColumn('lms_enrollments', 'grade')) {
                            $enrollmentUpdate['grade'] = $finalGrade;
                        }
                        if (Schema::hasColumn('lms_enrollments', 'recommend_retake')) {
                            $enrollmentUpdate['recommend_retake'] = $avgPercentage < $minPassingScore;
                        }
                        if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                            $enrollmentUpdate['updated_at'] = now();
                        }

                        DB::table('lms_enrollments')
                            ->where('course_id', $courseId)
                            ->where('user_id', $user->id)
                            ->update($enrollmentUpdate);

                        // Generate certificate if method exists
                        if (method_exists($this, 'generateCertificate')) {
                            try {
                                $this->generateCertificate($courseId, $user->id, $avgPercentage, $finalGrade);
                            } catch (\Exception $e) {
                                Log::warning('LMS: Failed to generate certificate', ['error' => $e->getMessage()]);
                            }
                        }
                    }
                }

                DB::commit();

                // Award points for quiz
                if ($passed) {
                    $quizPoints = $percentage >= 100 ? 30 : 20; // Bonus for perfect score
                    $this->awardPoints($user->id, $quizPoints, 'quiz_pass', $quizId, 'Položen kviz' . ($percentage >= 100 ? ' (savršeno!)' : ''));
                    $this->updateStreak($user->id);
                }

                // Load attempt for response
                $quizAttempt = DB::table('lms_quiz_attempts')->where('id', $quizAttemptId)->first();
                
                // Convert to array for manipulation
                $attemptResponse = $quizAttempt ? (array) $quizAttempt : [];
                
                // Decode JSON fields
                if (isset($attemptResponse['answers']) && is_string($attemptResponse['answers'])) {
                    $attemptResponse['answers'] = json_decode($attemptResponse['answers'], true);
                }
                if (isset($attemptResponse['question_results']) && is_string($attemptResponse['question_results'])) {
                    $attemptResponse['question_results'] = json_decode($attemptResponse['question_results'], true);
                }
                
                // Ensure numeric types are correct
                if (isset($attemptResponse['percentage'])) {
                    $attemptResponse['percentage'] = (float) $attemptResponse['percentage'];
                }
                if (isset($attemptResponse['score'])) {
                    $attemptResponse['score'] = (int) $attemptResponse['score'];
                }
                if (isset($attemptResponse['passed'])) {
                    $attemptResponse['passed'] = (bool) $attemptResponse['passed'];
                }
                if (isset($attemptResponse['recommend_retake'])) {
                    $attemptResponse['recommend_retake'] = (bool) $attemptResponse['recommend_retake'];
                }

                return response()->json([
                    'attempt' => $attemptResponse,
                    'message' => $passed ? 'Quiz passed!' : 'Quiz failed. Please review and retake.',
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to submit quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'quiz_id' => $quizId,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri slanju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create quiz (Manager/Admin only)
     */
    public function storeQuiz(Request $request, $courseId)
    {
        try {
            // Load course
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Courses table not found'], 500);
            }

            $course = DB::table('lms_courses')->where('id', $courseId)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check permission
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in storeQuiz', ['error' => $e->getMessage()]);
                }
            }
            
            if (!$isAdminOrManager && $course->instructor_id != $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'passing_score' => 'required|integer|min:0|max:100',
                'time_limit' => 'nullable|integer|min:0',
                'max_attempts' => 'nullable|integer|min:1',
                'order' => 'required|integer|min:1',
                'is_published' => 'boolean',
                'questions' => 'required|array|min:1',
                'questions.*.question' => 'required|string',
                'questions.*.type' => 'required|in:multiple_choice,true_false,short_answer',
                'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array',
                'questions.*.correct_answer' => 'required|string',
                'questions.*.points' => 'required|integer|min:1',
                'questions.*.order' => 'required|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $questions = $data['questions'];
            unset($data['questions']);

            $data['course_id'] = $courseId;
            $data['is_published'] = $data['is_published'] ?? false;

            // Check if tables exist
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quizzes table not found'], 500);
            }
            
            if (!Schema::hasTable('lms_quiz_questions')) {
                return response()->json(['message' => 'Quiz questions table not found'], 500);
            }

            DB::beginTransaction();
            try {
            // Get existing columns in lms_quizzes table
            $existingColumns = Schema::getColumnListing('lms_quizzes');
            
            // Filter data to only include existing columns
            $insertData = [];
            foreach ($data as $key => $value) {
                if (in_array($key, $existingColumns)) {
                    $insertData[$key] = $value;
                }
            }

            // Ensure timestamps
            if (in_array('created_at', $existingColumns)) {
                $insertData['created_at'] = now();
            }
            if (in_array('updated_at', $existingColumns)) {
                $insertData['updated_at'] = now();
            }

            // Insert quiz
            $quizId = DB::table('lms_quizzes')->insertGetId($insertData);

            // Insert questions
            $questionColumns = Schema::getColumnListing('lms_quiz_questions');
            foreach ($questions as $questionData) {
                $questionInsert = [
                    'quiz_id' => $quizId,
                    'question' => $questionData['question'],
                    'type' => $questionData['type'],
                    'correct_answer' => $questionData['correct_answer'],
                    'points' => $questionData['points'],
                    'order' => $questionData['order'],
                ];

                // Handle options JSON field
                if (isset($questionData['options']) && in_array('options', $questionColumns)) {
                    $questionInsert['options'] = json_encode($questionData['options']);
                }

                // Ensure timestamps for questions
                if (in_array('created_at', $questionColumns)) {
                    $questionInsert['created_at'] = now();
                }
                if (in_array('updated_at', $questionColumns)) {
                    $questionInsert['updated_at'] = now();
                }

                // Filter to only existing columns
                $filteredQuestionInsert = [];
                foreach ($questionInsert as $key => $value) {
                    if (in_array($key, $questionColumns)) {
                        $filteredQuestionInsert[$key] = $value;
                    }
                }

                DB::table('lms_quiz_questions')->insert($filteredQuestionInsert);
            }

            DB::commit();
            
            // Load quiz with questions for response
            $quiz = DB::table('lms_quizzes')->where('id', $quizId)->first();
            $quizQuestions = DB::table('lms_quiz_questions')
                ->where('quiz_id', $quizId)
                ->orderBy('order')
                ->get()
                ->map(function ($q) {
                    $qData = (array) $q;
                    if (isset($qData['options']) && $qData['options']) {
                        $qData['options'] = json_decode($qData['options'], true);
                    }
                    return $qData;
                });
            
            $quizData = (array) $quiz;
            $quizData['questions'] = $quizQuestions->toArray();
            
            return response()->json($quizData, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('LMS: Failed to create quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri čuvanju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Database error'
            ], 500);
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to store quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri čuvanju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update quiz and replace questions
     */
    public function updateQuiz(Request $request, $courseId, $quizId)
    {
        try {
            if (!Schema::hasTable('lms_courses') || !Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quizzes table not found'], 500);
            }

            $course = DB::table('lms_courses')->where('id', $courseId)->first();
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $quiz = DB::table('lms_quizzes')
                ->where('id', $quizId)
                ->where('course_id', $courseId)
                ->first();

            if (!$quiz) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in updateQuiz', ['error' => $e->getMessage()]);
                }
            }
            if (!$isAdminOrManager && isset($user->role)) {
                $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
            }
            if (!$isAdminOrManager && (!isset($course->instructor_id) || (int) $course->instructor_id !== (int) $user->id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'passing_score' => 'required|integer|min:0|max:100',
                'time_limit' => 'nullable|integer|min:0',
                'max_attempts' => 'nullable|integer|min:1',
                'order' => 'required|integer|min:1',
                'is_published' => 'boolean',
                'questions' => 'required|array|min:1',
                'questions.*.question' => 'required|string',
                'questions.*.type' => 'required|in:multiple_choice,true_false,short_answer',
                'questions.*.options' => 'required_if:questions.*.type,multiple_choice|array',
                'questions.*.correct_answer' => 'required|string',
                'questions.*.points' => 'required|integer|min:1',
                'questions.*.order' => 'required|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $questions = $data['questions'];
            unset($data['questions']);
            $data['is_published'] = $data['is_published'] ?? false;

            if (!Schema::hasTable('lms_quiz_questions')) {
                return response()->json(['message' => 'Quiz questions table not found'], 500);
            }

            DB::beginTransaction();
            try {
                $existingColumns = Schema::getColumnListing('lms_quizzes');
                $updateData = [];
                foreach ($data as $key => $value) {
                    if (in_array($key, $existingColumns)) {
                        $updateData[$key] = $value;
                    }
                }
                if (in_array('updated_at', $existingColumns)) {
                    $updateData['updated_at'] = now();
                }

                DB::table('lms_quizzes')->where('id', $quizId)->update($updateData);
                DB::table('lms_quiz_questions')->where('quiz_id', $quizId)->delete();

                $questionColumns = Schema::getColumnListing('lms_quiz_questions');
                foreach ($questions as $questionData) {
                    $questionInsert = [
                        'quiz_id' => $quizId,
                        'question' => $questionData['question'],
                        'type' => $questionData['type'],
                        'correct_answer' => $questionData['correct_answer'],
                        'points' => $questionData['points'],
                        'order' => $questionData['order'],
                    ];
                    if (isset($questionData['options']) && in_array('options', $questionColumns)) {
                        $questionInsert['options'] = json_encode($questionData['options']);
                    }
                    if (in_array('created_at', $questionColumns)) {
                        $questionInsert['created_at'] = now();
                    }
                    if (in_array('updated_at', $questionColumns)) {
                        $questionInsert['updated_at'] = now();
                    }

                    $filtered = [];
                    foreach ($questionInsert as $key => $value) {
                        if (in_array($key, $questionColumns)) {
                            $filtered[$key] = $value;
                        }
                    }
                    DB::table('lms_quiz_questions')->insert($filtered);
                }

                DB::commit();

                $updatedQuiz = DB::table('lms_quizzes')->where('id', $quizId)->first();
                $quizQuestions = DB::table('lms_quiz_questions')
                    ->where('quiz_id', $quizId)
                    ->orderBy('order')
                    ->get()
                    ->map(function ($q) {
                        $qData = (array) $q;
                        if (isset($qData['options']) && $qData['options']) {
                            $qData['options'] = json_decode($qData['options'], true);
                        }
                        return $qData;
                    });

                $quizData = (array) $updatedQuiz;
                $quizData['questions'] = $quizQuestions->toArray();

                return response()->json($quizData);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'quiz_id' => $quizId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Greška pri ažuriranju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Delete quiz and related data
     */
    public function deleteQuiz(Request $request, $courseId, $quizId)
    {
        try {
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quizzes table not found'], 500);
            }

            $course = Schema::hasTable('lms_courses')
                ? DB::table('lms_courses')->where('id', $courseId)->first()
                : null;

            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $quiz = DB::table('lms_quizzes')
                ->where('id', $quizId)
                ->where('course_id', $courseId)
                ->first();

            if (!$quiz) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $isAdminOrManager = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in deleteQuiz', ['error' => $e->getMessage()]);
                }
            }
            if (!$isAdminOrManager && isset($user->role)) {
                $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
            }
            $isInstructor = isset($course->instructor_id) && (int) $course->instructor_id === (int) $user->id;
            if (!$isAdminOrManager && !$isInstructor) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            DB::beginTransaction();
            try {
                if (Schema::hasTable('lms_quiz_attempts')) {
                    DB::table('lms_quiz_attempts')->where('quiz_id', $quizId)->delete();
                }
                if (Schema::hasTable('lms_quiz_questions')) {
                    DB::table('lms_quiz_questions')->where('quiz_id', $quizId)->delete();
                }

                DB::table('lms_quizzes')->where('id', $quizId)->where('course_id', $courseId)->delete();

                DB::commit();

                return response()->json(['message' => 'Kviz je uspješno obrisan']);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete quiz', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'quiz_id' => $quizId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Greška pri brisanju kviza',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get quiz attempts for a user
     */
    public function getQuizAttempts(Request $request, $courseId, $quizId)
    {
        try {
            if (!Schema::hasTable('lms_quizzes')) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            $quiz = DB::table('lms_quizzes')
                ->where('course_id', $courseId)
                ->where('id', $quizId)
                ->first();

            if (!$quiz) {
                return response()->json(['message' => 'Quiz not found'], 404);
            }

            $userId = $request->user()->id;
            $user = $request->user();

            // Check if user can view attempts
            $isAdminOrManager = false;
            $canViewAll = false;
            
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in getQuizAttempts', ['error' => $e->getMessage()]);
                }
            }

            // Load course to check instructor
            $course = null;
            if (Schema::hasTable('lms_courses')) {
                $course = DB::table('lms_courses')->where('id', $courseId)->first();
                if ($course && isset($course->instructor_id) && $course->instructor_id == $user->id) {
                    $canViewAll = true;
                }
            }

            if (!$isAdminOrManager && !$canViewAll) {
                // User can only see their own attempts
                if ($userId !== $user->id) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            }

            if (!Schema::hasTable('lms_quiz_attempts')) {
                return response()->json([]);
            }

            $attemptsQuery = DB::table('lms_quiz_attempts')
                ->where('quiz_id', $quizId);
            
            if (!$isAdminOrManager && !$canViewAll) {
                $attemptsQuery->where('user_id', $userId);
            }
            
            if (Schema::hasColumn('lms_quiz_attempts', 'created_at')) {
                $attemptsQuery->orderBy('created_at', 'desc');
            }

            $attempts = $attemptsQuery->get()->map(function ($attempt) {
                $attemptData = (array) $attempt;
                
                // Decode JSON fields
                if (isset($attemptData['answers']) && is_string($attemptData['answers'])) {
                    $attemptData['answers'] = json_decode($attemptData['answers'], true);
                }
                if (isset($attemptData['question_results']) && is_string($attemptData['question_results'])) {
                    $attemptData['question_results'] = json_decode($attemptData['question_results'], true);
                }

                // Load question attempts if table exists
                if (Schema::hasTable('lms_quiz_question_attempts')) {
                    try {
                        $questionAttempts = DB::table('lms_quiz_question_attempts')
                            ->where('quiz_attempt_id', $attempt->id)
                            ->get();
                        
                        $attemptData['question_attempts'] = $questionAttempts->map(function ($qa) {
                            $qaData = (array) $qa;
                            // Load question details if needed
                            if (Schema::hasTable('lms_quiz_questions') && isset($qa->question_id)) {
                                $question = DB::table('lms_quiz_questions')
                                    ->where('id', $qa->question_id)
                                    ->first();
                                if ($question) {
                                    $qaData['question'] = (array) $question;
                                }
                            }
                            return $qaData;
                        })->toArray();
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to load question attempts', ['error' => $e->getMessage()]);
                        $attemptData['question_attempts'] = [];
                    }
                } else {
                    $attemptData['question_attempts'] = [];
                }

                return $attemptData;
            });

            return response()->json($attempts);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load quiz attempts', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'quiz_id' => $quizId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju pokušaja',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ==================== CERTIFICATES ====================

    /**
     * Get user certificates
     */
    public function getCertificates(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            $userId = $user->id;

            // Check if certificates table exists
            if (!Schema::hasTable('lms_certificates')) {
                Log::warning('LMS: Certificates table does not exist - please run migrations');
                return response()->json([]);
            }
            
            Log::info('LMS: Loading certificates', ['user_id' => $userId]);

            // Load certificates using DB facade - don't filter by deleted courses at query level
            // We want to show certificates even if the course was deleted
            $certificatesQuery = DB::table('lms_certificates')
                ->where('lms_certificates.user_id', $userId);

            // Order by issued_at if column exists
            if (Schema::hasColumn('lms_certificates', 'issued_at')) {
                $certificatesQuery->orderBy('lms_certificates.issued_at', 'desc');
            }

            $certificatesData = $certificatesQuery->get();
            
            Log::info('LMS: Loaded certificates', [
                'user_id' => $userId,
                'count' => $certificatesData->count(),
                'certificate_ids' => $certificatesData->pluck('id')->toArray()
            ]);

            // Manually load course data for each certificate
            $certificates = [];
            foreach ($certificatesData as $certificate) {
                $certificateArray = (array) $certificate;

                // Load course if courses table exists (filter deleted courses, but still show certificate)
                if (Schema::hasTable('lms_courses') && isset($certificate->course_id)) {
                    try {
                        $courseQuery = DB::table('lms_courses')
                            ->where('id', $certificate->course_id);
                        
                        // Filter deleted courses - course won't be shown but certificate will
                        if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                            $courseQuery->whereNull('deleted_at');
                        }
                        
                        $course = $courseQuery->select('id', 'title', 'description')->first();

                        if ($course) {
                            $certificateArray['course'] = (array) $course;
                        } else {
                            // Course was deleted or doesn't exist - certificate will still be shown
                            $certificateArray['course'] = null;
                        }
                    } catch (\Exception $e) {
                        Log::warning('LMS: Failed to load course for certificate', [
                            'error' => $e->getMessage(),
                            'course_id' => $certificate->course_id
                        ]);
                        // Still show certificate even if course load fails
                        $certificateArray['course'] = null;
                    }
                } else {
                    // No course_id or courses table doesn't exist
                    $certificateArray['course'] = null;
                }

                // Always add certificate to results, even if course is missing
                $certificates[] = $certificateArray;
            }

            return response()->json($certificates);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load certificates', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);

            return response()->json([
                'message' => 'Greška pri učitavanju sertifikata',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get all available certificates (courses with certificate status)
     */
    public function getAvailableCertificates(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            $userId = $user->id;

            // Check if required tables exist
            if (!Schema::hasTable('lms_courses')) {
                return response()->json([]);
            }

            // Get all courses (not deleted) - show all courses that can have certificates
            $coursesQuery = DB::table('lms_courses')
                ->whereNull('lms_courses.deleted_at');

            // Don't filter by is_published - show all courses for certificates
            // Users should see all courses they can potentially get certificates for

            $courses = $coursesQuery->select('lms_courses.*')->get();

            // Get user's earned certificates
            $earnedCertificates = [];
            if (Schema::hasTable('lms_certificates')) {
                $earnedCertificatesData = DB::table('lms_certificates')
                    ->where('user_id', $userId)
                    ->get()
                    ->keyBy('course_id');
                
                foreach ($earnedCertificatesData as $cert) {
                    $earnedCertificates[$cert->course_id] = $cert;
                }
            }

            // Get user's enrollments to check progress
            $enrollments = [];
            if (Schema::hasTable('lms_enrollments')) {
                $enrollmentsData = DB::table('lms_enrollments')
                    ->where('user_id', $userId)
                    ->get()
                    ->keyBy('course_id');
                
                foreach ($enrollmentsData as $enrollment) {
                    $enrollments[$enrollment->course_id] = $enrollment;
                }
            }

            // Build response with certificate availability status
            $certificates = [];
            foreach ($courses as $course) {
                $courseId = $course->id;
                $certificate = isset($earnedCertificates[$courseId]) ? (array) $earnedCertificates[$courseId] : null;
                $enrollment = isset($enrollments[$courseId]) ? (array) $enrollments[$courseId] : null;
                
                $certificates[] = [
                    'id' => $certificate ? $certificate['id'] : null,
                    'course_id' => $courseId,
                    'user_id' => $userId,
                    'certificate_number' => $certificate ? $certificate['certificate_number'] : null,
                    'final_score' => $certificate ? ($certificate['final_score'] ?? null) : null,
                    'grade' => $certificate ? ($certificate['grade'] ?? null) : null,
                    'issued_at' => $certificate ? ($certificate['issued_at'] ?? null) : null,
                    'expires_at' => $certificate ? ($certificate['expires_at'] ?? null) : null,
                    'file_path' => $certificate ? ($certificate['file_path'] ?? null) : null,
                    'is_earned' => $certificate !== null,
                    'course' => [
                        'id' => $course->id,
                        'title' => $course->title,
                        'description' => $course->description ?? null,
                        'category' => $course->category ?? null,
                        'level' => $course->level ?? null,
                        'cover_image' => $course->cover_image ?? null,
                        'duration' => $course->duration ?? null,
                    ],
                    'enrollment' => $enrollment,
                    'progress' => $enrollment ? ($enrollment['progress'] ?? 0) : 0,
                    'is_completed' => $enrollment && isset($enrollment['completed_at']) && $enrollment['completed_at'] !== null,
                ];
            }

            return response()->json($certificates);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load available certificates', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);

            return response()->json([
                'message' => 'Greška pri učitavanju dostupnih certifikata',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get certificate details
     */
    public function getCertificate(Request $request, $certificateId)
    {
        try {
            // Check if certificates table exists
            if (!Schema::hasTable('lms_certificates')) {
                return response()->json(['message' => 'Certificate not found'], 404);
            }

            // Load certificate (join with course to filter deleted ones)
            $certificateQuery = DB::table('lms_certificates')
                ->where('lms_certificates.id', $certificateId);

            // Join with courses table if it exists to filter deleted courses
            if (Schema::hasTable('lms_courses')) {
                $certificateQuery->join('lms_courses', 'lms_certificates.course_id', '=', 'lms_courses.id');
                
                // Filter out certificates for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $certificateQuery->whereNull('lms_courses.deleted_at');
                }
            }

            $certificate = $certificateQuery->select('lms_certificates.*')->first();

            if (!$certificate) {
                return response()->json(['message' => 'Certificate not found'], 404);
            }

            // Check access
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in getCertificate', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager && (!isset($certificate->user_id) || $certificate->user_id != $user->id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $certificateData = (array) $certificate;

            // Load course if courses table exists (filter deleted courses)
            if (Schema::hasTable('lms_courses') && isset($certificate->course_id)) {
                try {
                    $courseQuery = DB::table('lms_courses')
                        ->where('id', $certificate->course_id);
                    
                    // Filter out deleted courses
                    if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                        $courseQuery->whereNull('deleted_at');
                    }
                    
                    $course = $courseQuery->first();

                    if ($course) {
                        $certificateData['course'] = (array) $course;
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load course for certificate', ['error' => $e->getMessage()]);
                }
            }

            // Load user if users table exists
            if (Schema::hasTable('users') && isset($certificate->user_id)) {
                try {
                    $certUser = DB::table('users')
                        ->where('id', $certificate->user_id)
                        ->select('id', 'name', 'email')
                        ->first();

                    if ($certUser) {
                        $certificateData['user'] = (array) $certUser;
                    }
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load user for certificate', ['error' => $e->getMessage()]);
                }
            }

            return response()->json($certificateData);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to load certificate', [
                'error' => $e->getMessage(),
                'certificate_id' => $certificateId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Greška pri učitavanju sertifikata',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Generate certificate for completed course
     */
    private function generateCertificate($courseId, $userId, $finalScore, $grade)
    {
        try {
            // Check if certificates table exists
            if (!Schema::hasTable('lms_certificates')) {
                Log::warning('LMS: Cannot generate certificate - certificates table not found');
                return null;
            }

            // Check if certificate already exists
            $existing = DB::table('lms_certificates')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->first();

            if ($existing) {
                return $existing;
            }

            // Generate certificate number
            $certificateNumber = 'CERT-' . strtoupper(Str::random(8)) . '-' . $courseId . '-' . $userId;

            // Get existing columns
            $existingColumns = Schema::getColumnListing('lms_certificates');
            $certificateData = [
                'course_id' => $courseId,
                'user_id' => $userId,
            ];

            // Add optional columns if they exist
            if (in_array('certificate_number', $existingColumns)) {
                $certificateData['certificate_number'] = $certificateNumber;
            }
            if (in_array('final_score', $existingColumns)) {
                $certificateData['final_score'] = $finalScore;
            }
            if (in_array('grade', $existingColumns)) {
                $certificateData['grade'] = $grade;
            }
            if (in_array('issued_at', $existingColumns)) {
                $certificateData['issued_at'] = now();
            }
            if (in_array('created_at', $existingColumns)) {
                $certificateData['created_at'] = now();
            }
            if (in_array('updated_at', $existingColumns)) {
                $certificateData['updated_at'] = now();
            }

            // Filter to only existing columns
            $filteredData = [];
            foreach ($certificateData as $key => $value) {
                if (in_array($key, $existingColumns)) {
                    $filteredData[$key] = $value;
                }
            }

            $certificateId = DB::table('lms_certificates')->insertGetId($filteredData);
            $certificate = DB::table('lms_certificates')->where('id', $certificateId)->first();

            return $certificate;
        } catch (\Exception $e) {
            Log::error('LMS: Failed to generate certificate', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Download certificate as PDF
     */
    public function downloadCertificatePdf(Request $request, $certificateId)
    {
        try {
            // Check if certificates table exists
            if (!Schema::hasTable('lms_certificates')) {
                return response()->json(['message' => 'Certificate not found'], 404);
            }

            // Load certificate (join with course to filter deleted ones)
            $certificateQuery = DB::table('lms_certificates')
                ->where('lms_certificates.id', $certificateId);

            // Join with courses table if it exists to filter deleted courses
            if (Schema::hasTable('lms_courses')) {
                $certificateQuery->join('lms_courses', 'lms_certificates.course_id', '=', 'lms_courses.id');
                
                // Filter out certificates for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $certificateQuery->whereNull('lms_courses.deleted_at');
                }
            }

            $certificate = $certificateQuery->select('lms_certificates.*')->first();

            if (!$certificate) {
                return response()->json(['message' => 'Certificate not found'], 404);
            }

            // Check access
            $user = $request->user();
            $isAdminOrManager = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdminOrManager = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to check user role in downloadCertificatePdf', ['error' => $e->getMessage()]);
                }
            }

            if (!$isAdminOrManager && (!isset($certificate->user_id) || $certificate->user_id != $user->id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Load course (filter deleted courses)
            $course = null;
            if (Schema::hasTable('lms_courses') && isset($certificate->course_id)) {
                $courseQuery = DB::table('lms_courses')
                    ->where('id', $certificate->course_id);
                
                // Filter out deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $courseQuery->whereNull('deleted_at');
                }
                
                $course = $courseQuery->first();
            }

            // Load user
            $certUser = null;
            if (Schema::hasTable('users') && isset($certificate->user_id)) {
                $certUser = DB::table('users')
                    ->where('id', $certificate->user_id)
                    ->select('id', 'name', 'email')
                    ->first();
            }

            $data = [
                'certificate' => $certificate,
                'course' => $course,
                'user' => $certUser,
            ];

            try {
                // Check if PDF package is available
                if (class_exists('Barryvdh\DomPDF\Facade\Pdf')) {
                    $pdf = Pdf::loadView('lms.certificate-pdf', $data);
                    $pdf->setPaper('a4', 'portrait');
                    $pdf->setOption('enable-local-file-access', true);
                    $pdf->setOption('isRemoteEnabled', true);
                    $pdf->setOption('defaultFont', 'DejaVu Sans');

                    $output = $pdf->output();
                    $outputSize = strlen($output);

                    Log::info('Certificate PDF generated successfully', [
                        'certificate_id' => $certificateId,
                        'output_size' => $outputSize,
                    ]);

                    if ($outputSize === 0) {
                        Log::error('Certificate PDF output is empty', ['certificate_id' => $certificateId]);
                        return response()->json(['error' => 'PDF output is empty'], 500);
                    }

                    return response()->streamDownload(function() use ($output) {
                        echo $output;
                    }, 'certifikat-' . $certificateId . '.pdf', [
                        'Content-Type' => 'application/pdf',
                        'Content-Length' => $outputSize,
                    ]);
                } else {
                    // If PDF package is not available, return JSON
                    Log::warning('PDF package not available, returning JSON');
                    return response()->json([
                        'message' => 'PDF generation not available',
                        'certificate' => $data
                    ]);
                }
            } catch (\Exception $pdfException) {
                Log::error('Certificate PDF Generation Exception', [
                    'error' => $pdfException->getMessage(),
                    'line' => $pdfException->getLine(),
                    'file' => $pdfException->getFile(),
                    'certificate_id' => $certificateId,
                    'trace' => $pdfException->getTraceAsString()
                ]);

                return response()->json([
                    'error' => 'Failed to generate PDF',
                    'message' => config('app.debug') ? $pdfException->getMessage() : 'Internal server error'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to download certificate PDF', [
                'error' => $e->getMessage(),
                'certificate_id' => $certificateId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Greška pri generisanju PDF certifikata',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Check and generate certificate for course if eligible
     */
    public function checkAndGenerateCertificate(Request $request, $courseId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $userId = $user->id;

            // Check if course exists
            if (!Schema::hasTable('lms_courses')) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $course = DB::table('lms_courses')
                ->where('id', $courseId)
                ->whereNull('deleted_at')
                ->first();

            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            // Check if enrollment exists
            if (!Schema::hasTable('lms_enrollments')) {
                return response()->json(['message' => 'Enrollment not found'], 404);
            }

            $enrollment = DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->first();

            if (!$enrollment) {
                return response()->json(['message' => 'You must enroll in this course first'], 403);
            }

            // Check if certificate already exists
            if (Schema::hasTable('lms_certificates')) {
                $existingCertificate = DB::table('lms_certificates')
                    ->where('course_id', $courseId)
                    ->where('user_id', $userId)
                    ->first();

                if ($existingCertificate) {
                    return response()->json([
                        'message' => 'Certificate already exists',
                        'certificate_id' => $existingCertificate->id,
                        'already_earned' => true
                    ]);
                }
            }

            // Check if all quizzes passed
            $allQuizzes = DB::table('lms_quizzes')
                ->where('course_id', $courseId);
            
            // Filter out soft-deleted quizzes
            if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                $allQuizzes->whereNull('deleted_at');
            }
            
            if (Schema::hasColumn('lms_quizzes', 'is_published')) {
                $allQuizzes->where('is_published', true);
            }
            
            $allQuizzes = $allQuizzes->get();

            if ($allQuizzes->count() === 0) {
                return response()->json([
                    'message' => 'Course has no quizzes. Certificate cannot be generated based on quiz completion.',
                    'eligible' => false,
                    'reason' => 'no_quizzes'
                ]);
            }

            $allQuizzesPassed = true;
            $totalQuizPercentage = 0;

            foreach ($allQuizzes as $courseQuiz) {
                $latestAttempt = DB::table('lms_quiz_attempts')
                    ->where('quiz_id', $courseQuiz->id)
                    ->where('user_id', $userId)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (!$latestAttempt || !isset($latestAttempt->passed) || !$latestAttempt->passed) {
                    $allQuizzesPassed = false;
                    break;
                }

                if (isset($latestAttempt->percentage)) {
                    $totalQuizPercentage += $latestAttempt->percentage;
                }
            }

            if (!$allQuizzesPassed) {
                return response()->json([
                    'message' => 'Not all quizzes have been passed',
                    'eligible' => false,
                    'reason' => 'quizzes_not_passed',
                    'total_quizzes' => $allQuizzes->count()
                ]);
            }

            // Calculate average and grade
            $avgPercentage = $totalQuizPercentage / $allQuizzes->count();
            $finalGrade = $this->calculateGrade($avgPercentage);

            // Generate certificate
            if (method_exists($this, 'generateCertificate')) {
                try {
                    $certificate = $this->generateCertificate($courseId, $userId, $avgPercentage, $finalGrade);
                    
                    if ($certificate) {
                        // Update enrollment if needed
                        if (!isset($enrollment->completed_at) || !$enrollment->completed_at) {
                            $enrollmentUpdate = [
                                'completed_at' => now(),
                                'progress' => 100,
                            ];

                            if (Schema::hasColumn('lms_enrollments', 'final_score')) {
                                $enrollmentUpdate['final_score'] = $avgPercentage;
                            }
                            if (Schema::hasColumn('lms_enrollments', 'grade')) {
                                $enrollmentUpdate['grade'] = $finalGrade;
                            }
                            if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                                $enrollmentUpdate['updated_at'] = now();
                            }

                            DB::table('lms_enrollments')
                                ->where('course_id', $courseId)
                                ->where('user_id', $userId)
                                ->update($enrollmentUpdate);
                        }

                        return response()->json([
                            'message' => 'Certificate generated successfully',
                            'certificate_id' => $certificate->id,
                            'eligible' => true
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('LMS: Failed to generate certificate in checkAndGenerateCertificate', [
                        'error' => $e->getMessage(),
                        'course_id' => $courseId,
                        'user_id' => $userId
                    ]);
                    return response()->json([
                        'message' => 'Failed to generate certificate',
                        'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
                    ], 500);
                }
            }

            return response()->json([
                'message' => 'Certificate generation method not available',
                'eligible' => false
            ], 500);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to check and generate certificate', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Greška pri proveri certifikata',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Calculate grade based on percentage
     */
    private function calculateGrade($percentage)
    {
        if ($percentage >= 90) return 'A';
        if ($percentage >= 80) return 'B';
        if ($percentage >= 70) return 'C';
        if ($percentage >= 60) return 'D';
        return 'F';
    }

    /**
     * Update enrollment progress
     */
    public function updateProgress(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_enrollments')) {
                return response()->json(['message' => 'Enrollments table not found'], 500);
            }

            $userId = $request->user()->id;

            $enrollment = DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->first();

            if (!$enrollment) {
                return response()->json(['message' => 'Enrollment not found'], 404);
            }

            $validator = Validator::make($request->all(), [
                'progress' => 'sometimes|integer|min:0|max:100',
                'final_score' => 'sometimes|numeric|min:0|max:100',
                'grade' => 'sometimes|string|max:5',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $validated = $validator->validated();
            
            // Filter to only existing columns
            $existingColumns = Schema::getColumnListing('lms_enrollments');
            $updateData = [];
            
            foreach ($validated as $key => $value) {
                if (in_array($key, $existingColumns)) {
                    $updateData[$key] = $value;
                }
            }
            
            if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                $updateData['updated_at'] = now();
            }

            DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->update($updateData);

            // Load updated enrollment
            $updatedEnrollment = DB::table('lms_enrollments')
                ->where('course_id', $courseId)
                ->where('user_id', $userId)
                ->first();

            return response()->json($updatedEnrollment);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update progress', [
                'error' => $e->getMessage(),
                'course_id' => $courseId,
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri ažuriranju progresa',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ==================== DASHBOARD STATISTICS ====================

    /**
     * Get user's learning dashboard statistics
     */
    public function getDashboardStats(Request $request)
    {
        try {
            $user = $request->user();
            $userId = $user->id;

            // Basic stats
            $enrolledCourses = 0;
            $completedCourses = 0;
            $totalLessonsCompleted = 0;
            $totalQuizzesPassed = 0;
            $averageScore = 0;
            $totalPoints = 0;
            $currentStreak = 0;

            // Get enrolled courses count (only for non-deleted courses)
            if (Schema::hasTable('lms_enrollments') && Schema::hasTable('lms_courses')) {
                $query = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                    ->where('lms_enrollments.user_id', $userId);
                
                // Filter out enrollments for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $query->whereNull('lms_courses.deleted_at');
                }
                
                $enrolledCourses = $query->distinct()->count('lms_enrollments.course_id');

                $completedQuery = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                    ->where('lms_enrollments.user_id', $userId)
                    ->whereNotNull('lms_enrollments.completed_at');
                
                // Filter out enrollments for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $completedQuery->whereNull('lms_courses.deleted_at');
                }
                
                $completedCourses = $completedQuery->distinct()->count('lms_enrollments.course_id');

                // Average score (only for non-deleted courses)
                $avgQuery = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                    ->where('lms_enrollments.user_id', $userId)
                    ->whereNotNull('lms_enrollments.final_score');
                
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $avgQuery->whereNull('lms_courses.deleted_at');
                }
                
                $avgResult = $avgQuery->avg('lms_enrollments.final_score');
                $averageScore = round($avgResult ?? 0, 1);
            }

            // Completed lessons
            if (Schema::hasTable('lms_lesson_progress')) {
                $totalLessonsCompleted = DB::table('lms_lesson_progress')
                    ->where('user_id', $userId)
                    ->whereNotNull('completed_at')
                    ->count();
            }

            // Passed quizzes (only for non-deleted quizzes/courses)
            if (Schema::hasTable('lms_quiz_attempts') && Schema::hasTable('lms_quizzes') && Schema::hasTable('lms_courses')) {
                $passedQuizzesQuery = DB::table('lms_quiz_attempts')
                    ->join('lms_quizzes', 'lms_quiz_attempts.quiz_id', '=', 'lms_quizzes.id')
                    ->join('lms_courses', 'lms_quizzes.course_id', '=', 'lms_courses.id')
                    ->where('lms_quiz_attempts.user_id', $userId)
                    ->where('lms_quiz_attempts.passed', true);
                
                // Filter out attempts for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $passedQuizzesQuery->whereNull('lms_courses.deleted_at');
                }
                
                // Filter out attempts for deleted quizzes
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $passedQuizzesQuery->whereNull('lms_quizzes.deleted_at');
                }
                
                $totalQuizzesPassed = $passedQuizzesQuery->distinct()->count('lms_quiz_attempts.quiz_id');
            } elseif (Schema::hasTable('lms_quiz_attempts')) {
                // Fallback if joins not possible
                $totalQuizzesPassed = DB::table('lms_quiz_attempts')
                    ->where('user_id', $userId)
                    ->where('passed', true)
                    ->count();
            }

            // Total points
            if (Schema::hasTable('lms_user_points')) {
                $totalPoints = DB::table('lms_user_points')
                    ->where('user_id', $userId)
                    ->sum('points');
            }

            // Current streak
            if (Schema::hasTable('lms_user_streaks')) {
                $streak = DB::table('lms_user_streaks')
                    ->where('user_id', $userId)
                    ->first();
                $currentStreak = $streak ? $streak->current_streak : 0;
            }

            // Recent activity (last 5 courses)
            $recentCourses = [];
            if (Schema::hasTable('lms_enrollments') && Schema::hasTable('lms_courses')) {
                try {
                    $selectColumns = ['lms_courses.id', 'lms_courses.title'];
                    
                    if (Schema::hasColumn('lms_enrollments', 'progress')) {
                        $selectColumns[] = 'lms_enrollments.progress';
                    }
                    if (Schema::hasColumn('lms_enrollments', 'enrolled_at')) {
                        $selectColumns[] = 'lms_enrollments.enrolled_at';
                    }
                    if (Schema::hasColumn('lms_enrollments', 'completed_at')) {
                        $selectColumns[] = 'lms_enrollments.completed_at';
                    }
                    
                    $query = DB::table('lms_enrollments')
                        ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                        ->where('lms_enrollments.user_id', $userId)
                        ->select($selectColumns);
                    
                    // Filter out deleted courses
                    if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                        $query->whereNull('lms_courses.deleted_at');
                    }
                    
                    if (Schema::hasColumn('lms_enrollments', 'updated_at')) {
                        $query->orderBy('lms_enrollments.updated_at', 'desc');
                    } else {
                        $query->orderBy('lms_enrollments.id', 'desc');
                    }
                    
                    $recentCourses = $query->limit(5)->get();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load recent courses', ['error' => $e->getMessage()]);
                    $recentCourses = [];
                }
            }

            // User badges
            $badges = [];
            if (Schema::hasTable('lms_user_badges') && Schema::hasTable('lms_badges')) {
                try {
                    $selectColumns = ['lms_badges.*'];
                    if (Schema::hasColumn('lms_user_badges', 'earned_at')) {
                        $selectColumns[] = 'lms_user_badges.earned_at';
                    }
                    
                    $query = DB::table('lms_user_badges')
                        ->join('lms_badges', 'lms_user_badges.badge_id', '=', 'lms_badges.id')
                        ->where('lms_user_badges.user_id', $userId)
                        ->select($selectColumns);
                    
                    if (Schema::hasColumn('lms_user_badges', 'earned_at')) {
                        $query->orderBy('lms_user_badges.earned_at', 'desc');
                    }
                    
                    $badges = $query->get();
                } catch (\Exception $e) {
                    Log::warning('LMS: Failed to load user badges', ['error' => $e->getMessage()]);
                    $badges = [];
                }
            }

            return response()->json([
                'stats' => [
                    'enrolled_courses' => $enrolledCourses,
                    'completed_courses' => $completedCourses,
                    'lessons_completed' => $totalLessonsCompleted,
                    'quizzes_passed' => $totalQuizzesPassed,
                    'average_score' => $averageScore,
                    'total_points' => $totalPoints,
                    'current_streak' => $currentStreak,
                ],
                'recent_courses' => $recentCourses,
                'badges' => $badges,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get dashboard stats', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load dashboard'], 500);
        }
    }

    // ==================== VIDEO PROGRESS ====================

    /**
     * Update video watch progress
     */
    public function updateVideoProgress(Request $request, $courseId, $lessonId)
    {
        try {
            $userId = $request->user()->id;

            $validator = Validator::make($request->all(), [
                'watched_seconds' => 'required|integer|min:0',
                'total_seconds' => 'nullable|integer|min:0',
                'last_position' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();

            if (!Schema::hasTable('lms_video_progress')) {
                return response()->json(['message' => 'Video progress tracking not available'], 503);
            }

            $watchedSeconds = $data['watched_seconds'];
            $totalSeconds = $data['total_seconds'] ?? null;
            $lastPosition = $data['last_position'] ?? $watchedSeconds;

            $percentage = 0;
            $isCompleted = false;
            if ($totalSeconds && $totalSeconds > 0) {
                $percentage = min(100, round(($watchedSeconds / $totalSeconds) * 100, 2));
                $isCompleted = $percentage >= 90; // Consider 90% as completed
            }

            DB::table('lms_video_progress')->updateOrInsert(
                ['user_id' => $userId, 'lesson_id' => $lessonId],
                [
                    'watched_seconds' => $watchedSeconds,
                    'total_seconds' => $totalSeconds,
                    'percentage' => $percentage,
                    'last_position' => $lastPosition,
                    'is_completed' => $isCompleted,
                    'updated_at' => now(),
                ]
            );

            // Award points for video completion
            if ($isCompleted) {
                $this->awardPoints($userId, 5, 'video_complete', $lessonId, 'Video završen');
                $this->updateStreak($userId);
            }

            return response()->json([
                'message' => 'Progress updated',
                'percentage' => $percentage,
                'is_completed' => $isCompleted,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update video progress', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to update progress'], 500);
        }
    }

    /**
     * Get video progress for a lesson
     */
    public function getVideoProgress(Request $request, $courseId, $lessonId)
    {
        try {
            $userId = $request->user()->id;

            if (!Schema::hasTable('lms_video_progress')) {
                return response()->json(['last_position' => 0, 'percentage' => 0]);
            }

            $progress = DB::table('lms_video_progress')
                ->where('user_id', $userId)
                ->where('lesson_id', $lessonId)
                ->first();

            return response()->json([
                'last_position' => $progress ? $progress->last_position : 0,
                'watched_seconds' => $progress ? $progress->watched_seconds : 0,
                'percentage' => $progress ? $progress->percentage : 0,
                'is_completed' => $progress ? (bool)$progress->is_completed : false,
            ]);
        } catch (\Exception $e) {
            return response()->json(['last_position' => 0, 'percentage' => 0]);
        }
    }

    // ==================== GAMIFICATION ====================

    /**
     * Get leaderboard
     */
    public function getLeaderboard(Request $request)
    {
        try {
            $period = $request->input('period', 'all'); // 'week', 'month', 'all'
            $limit = min($request->input('limit', 10), 50);

            $query = DB::table('users')
                ->select('users.id', 'users.name', 'users.lms_total_points as total_points');

            if ($period === 'week') {
                // Points earned this week
                $query = DB::table('lms_user_points')
                    ->join('users', 'lms_user_points.user_id', '=', 'users.id')
                    ->where('lms_user_points.created_at', '>=', now()->startOfWeek())
                    ->groupBy('users.id', 'users.name')
                    ->select('users.id', 'users.name', DB::raw('SUM(lms_user_points.points) as total_points'));
            } elseif ($period === 'month') {
                $query = DB::table('lms_user_points')
                    ->join('users', 'lms_user_points.user_id', '=', 'users.id')
                    ->where('lms_user_points.created_at', '>=', now()->startOfMonth())
                    ->groupBy('users.id', 'users.name')
                    ->select('users.id', 'users.name', DB::raw('SUM(lms_user_points.points) as total_points'));
            }

            $leaderboard = $query
                ->orderBy('total_points', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($user, $index) {
                    $user->rank = $index + 1;
                    return $user;
                });

            // Get current user's rank
            $currentUserId = $request->user()->id;
            $currentUserRank = null;
            foreach ($leaderboard as $entry) {
                if ($entry->id === $currentUserId) {
                    $currentUserRank = $entry->rank;
                    break;
                }
            }

            return response()->json([
                'leaderboard' => $leaderboard,
                'current_user_rank' => $currentUserRank,
                'period' => $period,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get leaderboard', ['error' => $e->getMessage()]);
            return response()->json(['leaderboard' => [], 'error' => 'Failed to load leaderboard'], 500);
        }
    }

    /**
     * Get all badges (available and earned)
     */
    public function getBadges(Request $request)
    {
        try {
            $userId = $request->user()->id;

            if (!Schema::hasTable('lms_badges')) {
                return response()->json(['badges' => []]);
            }

            $badges = DB::table('lms_badges')
                ->where('is_active', true)
                ->get()
                ->map(function ($badge) use ($userId) {
                    $earned = null;
                    if (Schema::hasTable('lms_user_badges')) {
                        $earned = DB::table('lms_user_badges')
                            ->where('user_id', $userId)
                            ->where('badge_id', $badge->id)
                            ->first();
                    }
                    $badge->is_earned = !is_null($earned);
                    $badge->earned_at = $earned ? $earned->earned_at : null;
                    return $badge;
                });

            return response()->json(['badges' => $badges]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get badges', ['error' => $e->getMessage()]);
            return response()->json(['badges' => []], 500);
        }
    }

    /**
     * Admin: list all badges (including inactive)
     */
    public function adminListBadges(Request $request)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_badges')) {
                return response()->json(['badges' => []]);
            }

            $badges = DB::table('lms_badges')->orderBy('id')->get();

            return response()->json(['badges' => $badges]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to list badges for admin', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri učitavanju bedževa'], 500);
        }
    }

    /**
     * Admin: create badge
     */
    public function storeBadge(Request $request)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_badges')) {
                return response()->json(['message' => 'Badges table not found'], 500);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'type' => 'required|in:course_completion,points,streak,quiz_master,special',
                'requirement_value' => 'nullable|integer|min:0',
                'points_reward' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $slug = $data['slug'] ?? Str::slug($data['name']);
            if (DB::table('lms_badges')->where('slug', $slug)->exists()) {
                $slug = $slug . '-' . Str::random(4);
            }

            $columns = Schema::getColumnListing('lms_badges');
            $insert = [
                'name' => $data['name'],
                'slug' => $slug,
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? 'FiAward',
                'color' => $data['color'] ?? '#f97316',
                'type' => $data['type'],
                'requirement_value' => $data['requirement_value'] ?? null,
                'points_reward' => $data['points_reward'] ?? 10,
                'is_active' => $data['is_active'] ?? true,
            ];

            if (in_array('created_at', $columns)) {
                $insert['created_at'] = now();
            }
            if (in_array('updated_at', $columns)) {
                $insert['updated_at'] = now();
            }

            $filtered = array_intersect_key($insert, array_flip($columns));
            $id = DB::table('lms_badges')->insertGetId($filtered);
            $badge = DB::table('lms_badges')->where('id', $id)->first();

            return response()->json($badge, 201);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to create badge', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri kreiranju bedža'], 500);
        }
    }

    /**
     * Admin: update badge
     */
    public function updateBadge(Request $request, $badgeId)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_badges')) {
                return response()->json(['message' => 'Badges table not found'], 500);
            }

            $badge = DB::table('lms_badges')->where('id', $badgeId)->first();
            if (!$badge) {
                return response()->json(['message' => 'Badge not found'], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'type' => 'required|in:course_completion,points,streak,quiz_master,special',
                'requirement_value' => 'nullable|integer|min:0',
                'points_reward' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $slug = $data['slug'] ?? Str::slug($data['name']);
            if (DB::table('lms_badges')->where('slug', $slug)->where('id', '!=', $badgeId)->exists()) {
                $slug = $slug . '-' . $badgeId;
            }

            $columns = Schema::getColumnListing('lms_badges');
            $update = [
                'name' => $data['name'],
                'slug' => $slug,
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? 'FiAward',
                'color' => $data['color'] ?? '#f97316',
                'type' => $data['type'],
                'requirement_value' => $data['requirement_value'] ?? null,
                'points_reward' => $data['points_reward'] ?? 10,
                'is_active' => $data['is_active'] ?? true,
            ];
            if (in_array('updated_at', $columns)) {
                $update['updated_at'] = now();
            }

            $filtered = array_intersect_key($update, array_flip($columns));
            DB::table('lms_badges')->where('id', $badgeId)->update($filtered);

            return response()->json(DB::table('lms_badges')->where('id', $badgeId)->first());
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update badge', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri ažuriranju bedža'], 500);
        }
    }

    /**
     * Admin: delete badge
     */
    public function deleteBadge(Request $request, $badgeId)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_badges')) {
                return response()->json(['message' => 'Badges table not found'], 500);
            }

            $badge = DB::table('lms_badges')->where('id', $badgeId)->first();
            if (!$badge) {
                return response()->json(['message' => 'Badge not found'], 404);
            }

            DB::beginTransaction();
            try {
                if (Schema::hasTable('lms_user_badges')) {
                    DB::table('lms_user_badges')->where('badge_id', $badgeId)->delete();
                }
                DB::table('lms_badges')->where('id', $badgeId)->delete();
                DB::commit();

                return response()->json(['message' => 'Bedž je uspješno obrisan']);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete badge', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri brisanju bedža'], 500);
        }
    }

    /**
     * Admin: list all issued certificates
     */
    public function adminListCertificates(Request $request)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_certificates')) {
                return response()->json(['certificates' => []]);
            }

            $query = DB::table('lms_certificates')->select('lms_certificates.*');

            if (Schema::hasTable('lms_courses')) {
                $query->leftJoin('lms_courses', 'lms_certificates.course_id', '=', 'lms_courses.id')
                    ->addSelect('lms_courses.title as course_title');
            }
            if (Schema::hasTable('users')) {
                $query->leftJoin('users', 'lms_certificates.user_id', '=', 'users.id')
                    ->addSelect('users.name as user_name', 'users.email as user_email');
            }

            if (Schema::hasColumn('lms_certificates', 'issued_at')) {
                $query->orderByDesc('lms_certificates.issued_at');
            } else {
                $query->orderByDesc('lms_certificates.id');
            }

            $certificates = $query->get();

            return response()->json(['certificates' => $certificates]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to list certificates for admin', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri učitavanju certifikata'], 500);
        }
    }

    /**
     * Admin: manually issue certificate for user/course
     */
    public function adminIssueCertificate(Request $request)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_certificates')) {
                return response()->json(['message' => 'Certificates table not found'], 500);
            }

            $validator = Validator::make($request->all(), [
                'course_id' => 'required|integer',
                'user_id' => 'required|integer',
                'final_score' => 'nullable|numeric|min:0|max:100',
                'grade' => 'nullable|string|max:10',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            $course = Schema::hasTable('lms_courses')
                ? DB::table('lms_courses')->where('id', $data['course_id'])->first()
                : null;
            if (!$course) {
                return response()->json(['message' => 'Course not found'], 404);
            }

            $user = DB::table('users')->where('id', $data['user_id'])->first();
            if (!$user) {
                return response()->json(['message' => 'User not found'], 404);
            }

            $existing = DB::table('lms_certificates')
                ->where('course_id', $data['course_id'])
                ->where('user_id', $data['user_id'])
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Certifikat već postoji za ovog korisnika i kurs',
                    'certificate' => $existing,
                    'already_earned' => true,
                ]);
            }

            $columns = Schema::getColumnListing('lms_certificates');
            $insert = [
                'course_id' => $data['course_id'],
                'user_id' => $data['user_id'],
                'certificate_number' => 'CERT-' . strtoupper(Str::random(10)),
                'issued_at' => now(),
            ];
            if (in_array('final_score', $columns)) {
                $insert['final_score'] = $data['final_score'] ?? null;
            }
            if (in_array('grade', $columns)) {
                $insert['grade'] = $data['grade'] ?? null;
            }

            $filtered = array_intersect_key($insert, array_flip($columns));
            $id = DB::table('lms_certificates')->insertGetId($filtered);
            $certificate = DB::table('lms_certificates')->where('id', $id)->first();

            return response()->json([
                'message' => 'Certifikat je uspješno izdan',
                'certificate' => $certificate,
            ], 201);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to issue certificate', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri izdavanju certifikata'], 500);
        }
    }

    /**
     * Admin: delete / revoke certificate
     */
    public function adminDeleteCertificate(Request $request, $certificateId)
    {
        try {
            if (!$this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!Schema::hasTable('lms_certificates')) {
                return response()->json(['message' => 'Certificates table not found'], 500);
            }

            $certificate = DB::table('lms_certificates')->where('id', $certificateId)->first();
            if (!$certificate) {
                return response()->json(['message' => 'Certificate not found'], 404);
            }

            DB::table('lms_certificates')->where('id', $certificateId)->delete();

            return response()->json(['message' => 'Certifikat je uspješno obrisan']);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete certificate', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Greška pri brisanju certifikata'], 500);
        }
    }

    /**
     * Check if user can manage LMS admin content
     */
    private function userCanManageLms($user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(['admin', 'manager', 'super-admin', 'super_admin'])) {
                    return true;
                }
            } catch (\Throwable $e) {
                // fall through
            }
        }

        if (isset($user->role) && in_array(strtolower((string) $user->role), ['admin', 'manager'], true)) {
            return true;
        }

        if (method_exists($user, 'can')) {
            try {
                return $user->can('lms.manage')
                    || $user->can('lms.manage_courses')
                    || $user->can('lms.maloprodaja.manage')
                    || $user->can('lms.create')
                    || $user->can('lms.update');
            } catch (\Throwable $e) {
                return false;
            }
        }

        return false;
    }

    /**
     * Get user's points history
     */
    public function getPointsHistory(Request $request)
    {
        try {
            $userId = $request->user()->id;
            $limit = min($request->input('limit', 20), 100);

            if (!Schema::hasTable('lms_user_points')) {
                return response()->json(['history' => [], 'total' => 0]);
            }

            $history = DB::table('lms_user_points')
                ->where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            $total = DB::table('lms_user_points')
                ->where('user_id', $userId)
                ->sum('points');

            return response()->json([
                'history' => $history,
                'total' => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['history' => [], 'total' => 0], 500);
        }
    }

    // ==================== SEARCH ====================

    /**
     * Advanced search across courses, lessons, and quizzes
     */
    public function search(Request $request)
    {
        try {
            $query = $request->input('q', '');
            $type = $request->input('type', 'all'); // 'all', 'courses', 'lessons', 'quizzes'
            $limit = min($request->input('limit', 20), 50);

            if (strlen($query) < 2) {
                return response()->json(['results' => [], 'message' => 'Query too short']);
            }

            $results = [
                'courses' => [],
                'lessons' => [],
                'quizzes' => [],
            ];

            // Search courses
            if ($type === 'all' || $type === 'courses') {
                if (Schema::hasTable('lms_courses')) {
                    $results['courses'] = DB::table('lms_courses')
                        ->where('is_published', true)
                        ->where(function ($q) use ($query) {
                            $q->where('title', 'LIKE', "%{$query}%")
                              ->orWhere('description', 'LIKE', "%{$query}%");
                        })
                        ->select('id', 'title', 'description', 'category', 'level')
                        ->limit($limit)
                        ->get()
                        ->map(function ($item) {
                            $item->type = 'course';
                            return $item;
                        });
                }
            }

            // Search lessons
            if ($type === 'all' || $type === 'lessons') {
                if (Schema::hasTable('lms_lessons')) {
                    $results['lessons'] = DB::table('lms_lessons')
                        ->join('lms_courses', 'lms_lessons.course_id', '=', 'lms_courses.id')
                        ->where('lms_courses.is_published', true)
                        ->where(function ($q) use ($query) {
                            $q->where('lms_lessons.title', 'LIKE', "%{$query}%")
                              ->orWhere('lms_lessons.description', 'LIKE', "%{$query}%")
                              ->orWhere('lms_lessons.content', 'LIKE', "%{$query}%");
                        })
                        ->select(
                            'lms_lessons.id',
                            'lms_lessons.title',
                            'lms_lessons.description',
                            'lms_lessons.course_id',
                            'lms_courses.title as course_title'
                        )
                        ->limit($limit)
                        ->get()
                        ->map(function ($item) {
                            $item->type = 'lesson';
                            return $item;
                        });
                }
            }

            // Search quizzes
            if ($type === 'all' || $type === 'quizzes') {
                if (Schema::hasTable('lms_quizzes')) {
                    $results['quizzes'] = DB::table('lms_quizzes')
                        ->join('lms_courses', 'lms_quizzes.course_id', '=', 'lms_courses.id')
                        ->where('lms_courses.is_published', true)
                        ->where(function ($q) use ($query) {
                            $q->where('lms_quizzes.title', 'LIKE', "%{$query}%")
                              ->orWhere('lms_quizzes.description', 'LIKE', "%{$query}%");
                        })
                        ->select(
                            'lms_quizzes.id',
                            'lms_quizzes.title',
                            'lms_quizzes.description',
                            'lms_quizzes.course_id',
                            'lms_courses.title as course_title'
                        )
                        ->limit($limit)
                        ->get()
                        ->map(function ($item) {
                            $item->type = 'quiz';
                            return $item;
                        });
                }
            }

            $totalResults = count($results['courses']) + count($results['lessons']) + count($results['quizzes']);

            return response()->json([
                'results' => $results,
                'total' => $totalResults,
                'query' => $query,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Search failed', ['error' => $e->getMessage()]);
            return response()->json(['results' => [], 'error' => 'Search failed'], 500);
        }
    }

    // ==================== ADMIN REPORTS ====================

    /**
     * Get admin reports overview
     */
    public function getAdminReports(Request $request)
    {
        try {
            $user = $request->user();
            
            // Check if user is admin
            $isAdmin = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdmin = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {}
            }
            if (!$isAdmin && isset($user->role)) {
                $isAdmin = in_array(strtolower($user->role), ['admin', 'manager']);
            }

            if (!$isAdmin) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $stats = [
                'total_users' => 0,
                'total_courses' => 0,
                'total_enrollments' => 0,
                'total_completions' => 0,
                'total_lessons' => 0,
                'total_quizzes' => 0,
                'average_completion_rate' => 0,
                'average_quiz_score' => 0,
            ];

            // Total users
            $stats['total_users'] = DB::table('users')->count();

            // Total courses (excluding deleted)
            if (Schema::hasTable('lms_courses')) {
                $query = DB::table('lms_courses');
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $query->whereNull('deleted_at');
                }
                $stats['total_courses'] = $query->count();
            }

            // Enrollments and completions (only for non-deleted courses)
            if (Schema::hasTable('lms_enrollments') && Schema::hasTable('lms_courses')) {
                $enrollmentsQuery = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id');
                
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $enrollmentsQuery->whereNull('lms_courses.deleted_at');
                }
                
                $stats['total_enrollments'] = $enrollmentsQuery->count();
                
                $completionsQuery = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                    ->whereNotNull('lms_enrollments.completed_at');
                
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $completionsQuery->whereNull('lms_courses.deleted_at');
                }
                
                $stats['total_completions'] = $completionsQuery->count();
                
                if ($stats['total_enrollments'] > 0) {
                    $stats['average_completion_rate'] = round(
                        ($stats['total_completions'] / $stats['total_enrollments']) * 100, 1
                    );
                }
            }

            // Total lessons
            if (Schema::hasTable('lms_lessons')) {
                $stats['total_lessons'] = DB::table('lms_lessons')->count();
            }

            // Total quizzes (only for non-deleted courses)
            if (Schema::hasTable('lms_quizzes') && Schema::hasTable('lms_courses')) {
                $quizzesQuery = DB::table('lms_quizzes')
                    ->join('lms_courses', 'lms_quizzes.course_id', '=', 'lms_courses.id');
                
                // Filter out quizzes for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $quizzesQuery->whereNull('lms_courses.deleted_at');
                }
                
                // Filter out deleted quizzes if soft delete is enabled
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $quizzesQuery->whereNull('lms_quizzes.deleted_at');
                }
                
                $stats['total_quizzes'] = $quizzesQuery->distinct()->count('lms_quizzes.id');
            } elseif (Schema::hasTable('lms_quizzes')) {
                // If courses table doesn't exist, just filter by deleted_at if column exists
                $quizzesQuery = DB::table('lms_quizzes');
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $quizzesQuery->whereNull('deleted_at');
                }
                $stats['total_quizzes'] = $quizzesQuery->count();
            }
            
            // Average quiz score (only for non-deleted quizzes/courses)
            if (Schema::hasTable('lms_quiz_attempts') && Schema::hasTable('lms_quizzes') && Schema::hasTable('lms_courses')) {
                $avgScoreQuery = DB::table('lms_quiz_attempts')
                    ->join('lms_quizzes', 'lms_quiz_attempts.quiz_id', '=', 'lms_quizzes.id')
                    ->join('lms_courses', 'lms_quizzes.course_id', '=', 'lms_courses.id');
                
                // Filter out attempts for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $avgScoreQuery->whereNull('lms_courses.deleted_at');
                }
                
                // Filter out attempts for deleted quizzes
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $avgScoreQuery->whereNull('lms_quizzes.deleted_at');
                }
                
                $avgScore = $avgScoreQuery->avg('lms_quiz_attempts.percentage');
                $stats['average_quiz_score'] = round($avgScore ?? 0, 1);
            } elseif (Schema::hasTable('lms_quiz_attempts') && Schema::hasTable('lms_quizzes')) {
                // If courses table doesn't exist, join only with quizzes
                $avgScoreQuery = DB::table('lms_quiz_attempts')
                    ->join('lms_quizzes', 'lms_quiz_attempts.quiz_id', '=', 'lms_quizzes.id');
                
                // Filter out attempts for deleted quizzes
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $avgScoreQuery->whereNull('lms_quizzes.deleted_at');
                }
                
                $avgScore = $avgScoreQuery->avg('lms_quiz_attempts.percentage');
                $stats['average_quiz_score'] = round($avgScore ?? 0, 1);
            } elseif (Schema::hasTable('lms_quiz_attempts')) {
                // Fallback if no joins possible
                $avgScore = DB::table('lms_quiz_attempts')->avg('percentage');
                $stats['average_quiz_score'] = round($avgScore ?? 0, 1);
            }

            // Course stats (only for non-deleted courses)
            $courseStats = [];
            if (Schema::hasTable('lms_courses') && Schema::hasTable('lms_enrollments')) {
                $courseStatsQuery = DB::table('lms_courses')
                    ->leftJoin('lms_enrollments', 'lms_courses.id', '=', 'lms_enrollments.course_id')
                    ->groupBy('lms_courses.id', 'lms_courses.title');
                
                // Filter out deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $courseStatsQuery->whereNull('lms_courses.deleted_at');
                }
                
                $courseStats = $courseStatsQuery
                    ->select(
                        'lms_courses.id',
                        'lms_courses.title',
                        DB::raw('COUNT(lms_enrollments.id) as enrollment_count'),
                        DB::raw('SUM(CASE WHEN lms_enrollments.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completion_count'),
                        DB::raw('AVG(lms_enrollments.progress) as avg_progress')
                    )
                    ->orderBy('enrollment_count', 'desc')
                    ->limit(10)
                    ->get();
            }

            // Recent enrollments (only for non-deleted courses)
            $recentEnrollments = [];
            if (Schema::hasTable('lms_enrollments')) {
                $recentEnrollmentsQuery = DB::table('lms_enrollments')
                    ->join('users', 'lms_enrollments.user_id', '=', 'users.id')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id');
                
                // Filter out enrollments for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $recentEnrollmentsQuery->whereNull('lms_courses.deleted_at');
                }
                
                $recentEnrollments = $recentEnrollmentsQuery
                    ->select(
                        'users.name as user_name',
                        'lms_courses.title as course_title',
                        'lms_enrollments.enrolled_at',
                        'lms_enrollments.progress'
                    )
                    ->orderBy('lms_enrollments.enrolled_at', 'desc')
                    ->limit(10)
                    ->get();
            }

            // User activity by day (last 30 days)
            $activityByDay = [];
            if (Schema::hasTable('lms_lesson_progress')) {
                $activityByDay = DB::table('lms_lesson_progress')
                    ->where('created_at', '>=', now()->subDays(30))
                    ->groupBy(DB::raw('DATE(created_at)'))
                    ->select(
                        DB::raw('DATE(created_at) as date'),
                        DB::raw('COUNT(*) as activity_count')
                    )
                    ->orderBy('date')
                    ->get();
            }

            return response()->json([
                'stats' => $stats,
                'course_stats' => $courseStats,
                'recent_enrollments' => $recentEnrollments,
                'activity_by_day' => $activityByDay,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get admin reports', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load reports'], 500);
        }
    }

    /**
     * Get detailed user report
     */
    public function getUserReport(Request $request, $userId)
    {
        try {
            $user = $request->user();
            
            // Check if user is admin or requesting their own report
            $isAdmin = false;
            if (method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdmin = $user->hasAnyRole(['admin', 'manager']);
                } catch (\Exception $e) {}
            }
            
            if (!$isAdmin && $user->id != $userId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $targetUser = DB::table('users')
                ->where('id', $userId)
                ->select('id', 'name', 'email', 'lms_total_points')
                ->first();

            if (!$targetUser) {
                return response()->json(['message' => 'User not found'], 404);
            }

            // Get enrollments (only for non-deleted courses)
            $enrollments = [];
            if (Schema::hasTable('lms_enrollments') && Schema::hasTable('lms_courses')) {
                $enrollmentsQuery = DB::table('lms_enrollments')
                    ->join('lms_courses', 'lms_enrollments.course_id', '=', 'lms_courses.id')
                    ->where('lms_enrollments.user_id', $userId);
                
                // Filter out enrollments for deleted courses
                if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                    $enrollmentsQuery->whereNull('lms_courses.deleted_at');
                }
                
                $enrollments = $enrollmentsQuery
                    ->select(
                        'lms_courses.id',
                        'lms_courses.title',
                        'lms_enrollments.progress',
                        'lms_enrollments.final_score',
                        'lms_enrollments.grade',
                        'lms_enrollments.enrolled_at',
                        'lms_enrollments.completed_at'
                    )
                    ->get();
            }

            // Get quiz attempts (only for non-deleted quizzes/courses)
            $quizAttempts = [];
            if (Schema::hasTable('lms_quiz_attempts') && Schema::hasTable('lms_quizzes')) {
                $quizAttemptsQuery = DB::table('lms_quiz_attempts')
                    ->join('lms_quizzes', 'lms_quiz_attempts.quiz_id', '=', 'lms_quizzes.id')
                    ->where('lms_quiz_attempts.user_id', $userId);
                
                // Filter out attempts for deleted quizzes
                if (Schema::hasColumn('lms_quizzes', 'deleted_at')) {
                    $quizAttemptsQuery->whereNull('lms_quizzes.deleted_at');
                }
                
                // Also filter by course if courses table exists
                if (Schema::hasTable('lms_courses')) {
                    $quizAttemptsQuery->join('lms_courses', 'lms_quizzes.course_id', '=', 'lms_courses.id');
                    
                    // Filter out attempts for deleted courses
                    if (Schema::hasColumn('lms_courses', 'deleted_at')) {
                        $quizAttemptsQuery->whereNull('lms_courses.deleted_at');
                    }
                }
                
                $quizAttempts = $quizAttemptsQuery
                    ->select(
                        'lms_quizzes.title',
                        'lms_quiz_attempts.score',
                        'lms_quiz_attempts.percentage',
                        'lms_quiz_attempts.passed',
                        'lms_quiz_attempts.created_at'
                    )
                    ->orderBy('lms_quiz_attempts.created_at', 'desc')
                    ->limit(20)
                    ->get();
            }

            // Get badges
            $badges = [];
            if (Schema::hasTable('lms_user_badges') && Schema::hasTable('lms_badges')) {
                $badges = DB::table('lms_user_badges')
                    ->join('lms_badges', 'lms_user_badges.badge_id', '=', 'lms_badges.id')
                    ->where('lms_user_badges.user_id', $userId)
                    ->select('lms_badges.*', 'lms_user_badges.earned_at')
                    ->get();
            }

            return response()->json([
                'user' => $targetUser,
                'enrollments' => $enrollments,
                'quiz_attempts' => $quizAttempts,
                'badges' => $badges,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get user report', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load report'], 500);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Award points to user
     */
    private function awardPoints($userId, $points, $source, $sourceId = null, $description = null)
    {
        try {
            if (!Schema::hasTable('lms_user_points')) {
                return false;
            }

            DB::table('lms_user_points')->insert([
                'user_id' => $userId,
                'points' => $points,
                'type' => 'earned',
                'source' => $source,
                'source_id' => $sourceId,
                'description' => $description,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update user total points
            if (Schema::hasColumn('users', 'lms_total_points')) {
                DB::table('users')
                    ->where('id', $userId)
                    ->increment('lms_total_points', $points);
            }

            // Check for badges
            $this->checkAndAwardBadges($userId);

            return true;
        } catch (\Exception $e) {
            Log::warning('LMS: Failed to award points', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Update user streak
     */
    private function updateStreak($userId)
    {
        try {
            if (!Schema::hasTable('lms_user_streaks')) {
                return;
            }

            $streak = DB::table('lms_user_streaks')
                ->where('user_id', $userId)
                ->first();

            $today = now()->toDateString();

            if (!$streak) {
                DB::table('lms_user_streaks')->insert([
                    'user_id' => $userId,
                    'current_streak' => 1,
                    'longest_streak' => 1,
                    'last_activity_date' => $today,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $lastDate = $streak->last_activity_date;
                $yesterday = now()->subDay()->toDateString();

                if ($lastDate === $today) {
                    // Already counted today
                    return;
                } elseif ($lastDate === $yesterday) {
                    // Continuing streak
                    $newStreak = $streak->current_streak + 1;
                    $longestStreak = max($streak->longest_streak, $newStreak);
                    
                    DB::table('lms_user_streaks')
                        ->where('user_id', $userId)
                        ->update([
                            'current_streak' => $newStreak,
                            'longest_streak' => $longestStreak,
                            'last_activity_date' => $today,
                            'updated_at' => now(),
                        ]);
                } else {
                    // Streak broken, start new
                    DB::table('lms_user_streaks')
                        ->where('user_id', $userId)
                        ->update([
                            'current_streak' => 1,
                            'last_activity_date' => $today,
                            'updated_at' => now(),
                        ]);
                }
            }
        } catch (\Exception $e) {
            Log::warning('LMS: Failed to update streak', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Check and award badges
     */
    private function checkAndAwardBadges($userId)
    {
        try {
            if (!Schema::hasTable('lms_badges') || !Schema::hasTable('lms_user_badges')) {
                return;
            }

            $badges = DB::table('lms_badges')
                ->where('is_active', true)
                ->get();

            foreach ($badges as $badge) {
                // Check if already earned
                $alreadyEarned = DB::table('lms_user_badges')
                    ->where('user_id', $userId)
                    ->where('badge_id', $badge->id)
                    ->exists();

                if ($alreadyEarned) {
                    continue;
                }

                $shouldAward = false;

                switch ($badge->type) {
                    case 'course_completion':
                        if (Schema::hasTable('lms_enrollments')) {
                            $completed = DB::table('lms_enrollments')
                                ->where('user_id', $userId)
                                ->whereNotNull('completed_at')
                                ->count();
                            $shouldAward = $completed >= ($badge->requirement_value ?? 1);
                        }
                        break;

                    case 'points':
                        $totalPoints = DB::table('lms_user_points')
                            ->where('user_id', $userId)
                            ->sum('points');
                        $shouldAward = $totalPoints >= ($badge->requirement_value ?? 100);
                        break;

                    case 'streak':
                        if (Schema::hasTable('lms_user_streaks')) {
                            $streak = DB::table('lms_user_streaks')
                                ->where('user_id', $userId)
                                ->first();
                            $shouldAward = $streak && $streak->current_streak >= ($badge->requirement_value ?? 7);
                        }
                        break;

                    case 'quiz_master':
                        if (Schema::hasTable('lms_quiz_attempts')) {
                            $perfectQuizzes = DB::table('lms_quiz_attempts')
                                ->where('user_id', $userId)
                                ->where('percentage', 100)
                                ->count();
                            $shouldAward = $perfectQuizzes >= ($badge->requirement_value ?? 10);
                        }
                        break;
                }

                if ($shouldAward) {
                    DB::table('lms_user_badges')->insert([
                        'user_id' => $userId,
                        'badge_id' => $badge->id,
                        'earned_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Award bonus points for badge
                    if ($badge->points_reward > 0) {
                        DB::table('lms_user_points')->insert([
                            'user_id' => $userId,
                            'points' => $badge->points_reward,
                            'type' => 'bonus',
                            'source' => 'badge',
                            'source_id' => $badge->id,
                            'description' => "Osvojen bedž: {$badge->name}",
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        if (Schema::hasColumn('users', 'lms_total_points')) {
                            DB::table('users')
                                ->where('id', $userId)
                                ->increment('lms_total_points', $badge->points_reward);
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('LMS: Failed to check badges', ['error' => $e->getMessage()]);
        }
    }

    // ==================== SURPRISES ====================

    /**
     * Get course surprise settings
     */
    public function getCourseSurprises(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_course_surprises')) {
                return response()->json([
                    'settings' => null,
                    'rewards' => []
                ]);
            }

            $settings = CourseSurprise::where('course_id', $courseId)->first();
            $rewards = SurpriseReward::where('course_id', $courseId)
                ->orderBy('type')
                ->orderBy('order')
                ->get();

            return response()->json([
                'settings' => $settings,
                'rewards' => $rewards
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get course surprises', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load surprise settings'], 500);
        }
    }

    /**
     * Update course surprise settings
     */
    public function updateCourseSurprises(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_course_surprises')) {
                return response()->json(['error' => 'Surprises table does not exist'], 400);
            }

            $validator = Validator::make($request->all(), [
                'scratch_card_enabled' => 'boolean',
                'scratch_card_after_quiz' => 'boolean',
                'scratch_card_cooldown_hours' => 'integer|min:0',
                'spin_wheel_enabled' => 'boolean',
                'spin_wheel_after_quiz' => 'boolean',
                'spin_wheel_cooldown_hours' => 'integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $settings = CourseSurprise::updateOrCreate(
                ['course_id' => $courseId],
                $request->only([
                    'scratch_card_enabled',
                    'scratch_card_after_quiz',
                    'scratch_card_cooldown_hours',
                    'spin_wheel_enabled',
                    'spin_wheel_after_quiz',
                    'spin_wheel_cooldown_hours',
                ])
            );

            return response()->json([
                'message' => 'Surprise settings updated',
                'settings' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to update course surprises', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to update settings'], 500);
        }
    }

    /**
     * Create or update surprise reward
     */
    public function saveSurpriseReward(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_surprise_rewards')) {
                return response()->json(['error' => 'Surprise rewards table does not exist'], 400);
            }

            $validator = Validator::make($request->all(), [
                'id' => 'nullable|exists:lms_surprise_rewards,id',
                'type' => 'required|in:scratch_card,spin_wheel',
                'reward_type' => 'required|in:bonus_points,extra_luck,second_chance,nice_gift,wish_success,motivational_message',
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'message' => 'nullable|string',
                'points_value' => 'nullable|integer|min:0',
                'probability' => 'required|numeric|min:0|max:100',
                'order' => 'integer|min:0',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $data = $request->all();
            $data['course_id'] = $courseId;

            if ($request->has('id') && $request->id) {
                $reward = SurpriseReward::findOrFail($request->id);
                $reward->update($data);
            } else {
                $reward = SurpriseReward::create($data);
            }

            return response()->json([
                'message' => 'Reward saved',
                'reward' => $reward
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to save surprise reward', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to save reward'], 500);
        }
    }

    /**
     * Delete surprise reward
     */
    public function deleteSurpriseReward(Request $request, $courseId, $rewardId)
    {
        try {
            $reward = SurpriseReward::where('course_id', $courseId)
                ->where('id', $rewardId)
                ->firstOrFail();
            
            $reward->delete();

            return response()->json(['message' => 'Reward deleted']);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to delete surprise reward', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete reward'], 500);
        }
    }

    /**
     * Check if user can play surprise (after quiz)
     */
    public function checkSurpriseAvailability(Request $request, $courseId, $quizId)
    {
        try {
            if (!Schema::hasTable('lms_course_surprises')) {
                return response()->json([
                    'available' => false,
                    'scratch_card' => false,
                    'spin_wheel' => false
                ]);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $settings = CourseSurprise::where('course_id', $courseId)->first();
            if (!$settings) {
                return response()->json([
                    'available' => false,
                    'scratch_card' => false,
                    'spin_wheel' => false
                ]);
            }

            $scratchCardAvailable = false;
            $spinWheelAvailable = false;

            // Check scratch card
            if ($settings->scratch_card_enabled && $settings->scratch_card_after_quiz) {
                $lastAttempt = UserSurpriseAttempt::where('course_id', $courseId)
                    ->where('user_id', $user->id)
                    ->where('surprise_type', 'scratch_card')
                    ->where('quiz_id', $quizId)
                    ->latest()
                    ->first();

                if (!$lastAttempt || 
                    now()->diffInHours($lastAttempt->created_at) >= $settings->scratch_card_cooldown_hours) {
                    $scratchCardAvailable = true;
                }
            }

            // Check spin wheel
            if ($settings->spin_wheel_enabled && $settings->spin_wheel_after_quiz) {
                $lastAttempt = UserSurpriseAttempt::where('course_id', $courseId)
                    ->where('user_id', $user->id)
                    ->where('surprise_type', 'spin_wheel')
                    ->where('quiz_id', $quizId)
                    ->latest()
                    ->first();

                if (!$lastAttempt || 
                    now()->diffInHours($lastAttempt->created_at) >= $settings->spin_wheel_cooldown_hours) {
                    $spinWheelAvailable = true;
                }
            }

            return response()->json([
                'available' => $scratchCardAvailable || $spinWheelAvailable,
                'scratch_card' => $scratchCardAvailable,
                'spin_wheel' => $spinWheelAvailable
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to check surprise availability', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to check availability'], 500);
        }
    }

    /**
     * Play scratch card or spin wheel
     */
    public function playSurprise(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_user_surprise_attempts')) {
                return response()->json(['error' => 'Surprise attempts table does not exist'], 400);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $validator = Validator::make($request->all(), [
                'surprise_type' => 'required|in:scratch_card,spin_wheel',
                'quiz_id' => 'nullable|exists:lms_quizzes,id',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $surpriseType = $request->surprise_type;
            $quizId = $request->quiz_id;

            // Get settings
            $settings = CourseSurprise::where('course_id', $courseId)->first();
            if (!$settings) {
                return response()->json(['error' => 'Surprises not enabled for this course'], 400);
            }

            $enabledField = $surpriseType === 'scratch_card' ? 'scratch_card_enabled' : 'spin_wheel_enabled';
            if (!$settings->$enabledField) {
                return response()->json(['error' => 'This surprise type is not enabled'], 400);
            }

            // Check cooldown
            $cooldownField = $surpriseType === 'scratch_card' ? 'scratch_card_cooldown_hours' : 'spin_wheel_cooldown_hours';
            $lastAttempt = UserSurpriseAttempt::where('course_id', $courseId)
                ->where('user_id', $user->id)
                ->where('surprise_type', $surpriseType)
                ->when($quizId, function($q) use ($quizId) {
                    return $q->where('quiz_id', $quizId);
                })
                ->latest()
                ->first();

            if ($lastAttempt && now()->diffInHours($lastAttempt->created_at) < $settings->$cooldownField) {
                return response()->json(['error' => 'Please wait before trying again'], 400);
            }

            // Get available rewards
            $rewards = SurpriseReward::where('course_id', $courseId)
                ->where('type', $surpriseType)
                ->where('is_active', true)
                ->get();

            if ($rewards->isEmpty()) {
                return response()->json(['error' => 'No rewards available'], 400);
            }

            // Select reward based on probability
            $selectedReward = $this->selectRewardByProbability($rewards);

            // Create attempt
            $attempt = UserSurpriseAttempt::create([
                'course_id' => $courseId,
                'user_id' => $user->id,
                'quiz_id' => $quizId,
                'surprise_type' => $surpriseType,
                'reward_id' => $selectedReward->id,
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            // Award reward if applicable
            if ($selectedReward->reward_type === 'bonus_points' && $selectedReward->points_value) {
                $this->awardPoints($user->id, $selectedReward->points_value, 'surprise_reward', $courseId, $selectedReward->title);
            }

            return response()->json([
                'message' => 'Surprise played successfully',
                'attempt' => $attempt->load('reward'),
                'reward' => $selectedReward
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to play surprise', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to play surprise'], 500);
        }
    }

    /**
     * Select reward based on probability
     */
    private function selectRewardByProbability($rewards)
    {
        $totalProbability = $rewards->sum('probability');
        $random = mt_rand(0, (int)($totalProbability * 100)) / 100;

        $cumulative = 0;
        foreach ($rewards as $reward) {
            $cumulative += $reward->probability;
            if ($random <= $cumulative) {
                return $reward;
            }
        }

        // Fallback to first reward
        return $rewards->first();
    }

    /**
     * Get user surprise attempts
     */
    public function getUserSurpriseAttempts(Request $request, $courseId)
    {
        try {
            if (!Schema::hasTable('lms_user_surprise_attempts')) {
                return response()->json(['attempts' => []]);
            }

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $attempts = UserSurpriseAttempt::where('course_id', $courseId)
                ->where('user_id', $user->id)
                ->with('reward')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json(['attempts' => $attempts]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to get user surprise attempts', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load attempts'], 500);
        }
    }

    /**
     * Upload course cover image
     */
    public function uploadCourseImage(Request $request)
    {
        try {
            if (! $this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Access denied'], 403);
            }

            $validator = Validator::make($request->all(), [
                'image' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $file = $request->file('image');
            $originalName = $file->getClientOriginalName();
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // Store file in public storage
            $path = $file->storeAs('lms/course_images', $filename, 'public');
            
            // Return full URL
            $url = asset('storage/' . $path);

            return response()->json([
                'url' => $url,
                'path' => $path,
                'filename' => $originalName,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to upload course image', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to upload image'], 500);
        }
    }

    /**
     * Upload lesson image
     */
    public function uploadLessonImage(Request $request)
    {
        try {
            if (! $this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Access denied'], 403);
            }

            $validator = Validator::make($request->all(), [
                'image' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $file = $request->file('image');
            $originalName = $file->getClientOriginalName();
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // Store file in public storage
            $path = $file->storeAs('lms/lesson_images', $filename, 'public');
            
            // Return full URL
            $url = asset('storage/' . $path);

            return response()->json([
                'url' => $url,
                'path' => $path,
                'filename' => $originalName,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to upload lesson image', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to upload image'], 500);
        }
    }

    /**
     * Upload lesson file (image or PDF)
     */
    public function uploadLessonFile(Request $request)
    {
        try {
            if (! $this->userCanManageLms($request->user())) {
                return response()->json(['message' => 'Access denied'], 403);
            }

            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:10240', // 10MB max, images and PDF
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // Determine file type
            $fileType = str_starts_with($mimeType, 'image/') ? 'image' : 'pdf';
            $storagePath = $fileType === 'image' ? 'lms/lesson_files/images' : 'lms/lesson_files/pdfs';
            
            // Store file in public storage
            $path = $file->storeAs($storagePath, $filename, 'public');
            
            // Return full URL
            $url = asset('storage/' . $path);

            return response()->json([
                'url' => $url,
                'path' => $path,
                'filename' => $originalName,
                'file_type' => $fileType,
                'mime_type' => $mimeType,
                'file_size' => $size,
            ]);
        } catch (\Exception $e) {
            Log::error('LMS: Failed to upload lesson file', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to upload file'], 500);
        }
    }
}
