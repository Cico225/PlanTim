<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Database\Schema\Blueprint;
use App\Services\NotificationService;
use App\Services\ChatService;

class ProjectController extends Controller
{
    /**
     * Check if user has Projects module permission
     */
    protected function checkPermission($user, $permission)
    {
        // Admin and manager always have access
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(['admin', 'manager', 'super-admin'])) {
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to check user roles', ['error' => $e->getMessage()]);
            }
        }

        // Check user_module_permissions
        if (!Schema::hasTable('user_module_permissions')) {
            return false;
        }

        try {
            $userPermission = DB::table('user_module_permissions')
                ->where('user_id', $user->id)
                ->where('module_name', 'projects')
                ->first();

            if (!$userPermission) {
                return false;
            }

            // Map permission types
            switch ($permission) {
                case 'view':
                case 'read':
                    return $userPermission->can_view || $userPermission->can_read;
                case 'create':
                    return $userPermission->can_create;
                case 'update':
                    return $userPermission->can_update;
                case 'delete':
                    return $userPermission->can_delete;
                default:
                    return false;
            }
        } catch (\Exception $e) {
            Log::error('Projects: Failed to check user permissions', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'permission' => $permission
            ]);
            return false;
        }
    }
    /**
     * Get all projects
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            // Check permission
            if (!$this->checkPermission($user, 'read')) {
                return response()->json(['message' => 'Nemate dozvolu za pregled projekata'], 403);
            }

            $query = DB::table('projects')
                ->select('projects.*', 'users.name as owner_name')
                ->leftJoin('users', 'projects.owner_id', '=', 'users.id')
                ->distinct()
                ->orderBy('projects.created_at', 'desc');

        // Simple search (by name)
        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->where('projects.name', 'like', "%{$search}%");
        }

        // Advanced search filters
        if ($request->has('status') && $request->input('status')) {
            $query->where('projects.status', $request->input('status'));
        }

        if ($request->has('owner_id') && $request->input('owner_id')) {
            $query->where('projects.owner_id', $request->input('owner_id'));
        }

        if ($request->has('date_from') && $request->input('date_from')) {
            $query->whereDate('projects.created_at', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to') && $request->input('date_to')) {
            $query->whereDate('projects.created_at', '<=', $request->input('date_to'));
        }

        // Filter by users in project (project_members)
        if ($request->has('user_ids') && is_array($request->input('user_ids')) && !empty($request->input('user_ids'))) {
            $userIds = $request->input('user_ids');
            if (Schema::hasTable('project_members')) {
                $projectIds = DB::table('project_members')
                    ->whereIn('user_id', $userIds)
                    ->pluck('project_id')
                    ->unique()
                    ->toArray();
                if (!empty($projectIds)) {
                    $query->whereIn('projects.id', $projectIds);
                } else {
                    // No projects found with these users
                    $query->whereRaw('1 = 0');
                }
            }
        }

        // Filter by task status (projects that have tasks with specific status)
        if ($request->has('task_status') && $request->input('task_status')) {
            $taskStatus = $request->input('task_status');
            if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'status')) {
                $projectIds = DB::table('tasks')
                    ->where('status', $taskStatus)
                    ->whereNotNull('project_id')
                    ->pluck('project_id')
                    ->unique()
                    ->toArray();
                if (!empty($projectIds)) {
                    $query->whereIn('projects.id', $projectIds);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }
        }

        $projects = $query->paginate(15);

            return response()->json($projects);
        } catch (\Exception $e) {
            Log::error('Projects index error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Failed to load projects',
                'message' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    /**
     * Get users and roles for project creation
     */
    public function getUsersAndRoles(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu za kreiranje projekata'], 403);
        }

        try {
            // Get all active users
            $usersQuery = DB::table('users')
                ->select('id', 'name', 'email');
            
            // Only filter by is_active if column exists
            if (Schema::hasColumn('users', 'is_active')) {
                $usersQuery->where('is_active', true);
            }
            
            $users = $usersQuery->orderBy('name', 'asc')->get();

            // Get all roles
            $roles = collect([]);
            if (Schema::hasTable('roles')) {
                // Check if display_name column exists
                $hasDisplayName = Schema::hasColumn('roles', 'display_name');
                $selectColumns = $hasDisplayName 
                    ? ['id', 'name', 'display_name'] 
                    : ['id', 'name'];
                
                $rolesQuery = DB::table('roles')->select($selectColumns);
                
                // Order by display_name if it exists, otherwise by name
                if ($hasDisplayName) {
                    $rolesQuery->orderBy('display_name', 'asc');
                } else {
                    $rolesQuery->orderBy('name', 'asc');
                }
                
                $roles = $rolesQuery->get()->map(function ($role) use ($hasDisplayName) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'display_name' => $hasDisplayName ? ($role->display_name ?? $role->name) : $role->name,
                    ];
                });
            }

            return response()->json([
                'users' => $users,
                'roles' => $roles->values()->all(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching users and roles: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Greška pri učitavanju korisnika i uloga',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store new project
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu za kreiranje projekata'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:planning,active,on-hold,completed,cancelled',
            'priority' => 'required|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['owner_id'] = $user->id;
        if (Schema::hasColumn('projects', 'created_by')) {
            $data['created_by'] = $user->id;
        }
        $data['progress'] = 0;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        // Remove role_ids and user_ids from project data
        $roleIds = $data['role_ids'] ?? [];
        $userIds = $data['user_ids'] ?? [];
        unset($data['role_ids'], $data['user_ids']);

        DB::beginTransaction();
        try {
            $projectId = DB::table('projects')->insertGetId($data);
            $project = DB::table('projects')->find($projectId);

            // Assign roles to project
            if (!empty($roleIds) && Schema::hasTable('project_roles')) {
                foreach ($roleIds as $roleId) {
                    DB::table('project_roles')->insert([
                        'project_id' => $projectId,
                        'role_id' => $roleId,
                        'can_view' => true,
                        'can_edit' => true,
                        'can_delete' => false,
                        'assigned_at' => now(),
                    ]);
                }
            }

            // Assign users to project as members
            if (!empty($userIds) && Schema::hasTable('project_members')) {
                foreach ($userIds as $userId) {
                    // Check if user is already a member (owner is automatically a member)
                    if ($userId != $user->id) {
                        DB::table('project_members')->insert([
                            'project_id' => $projectId,
                            'user_id' => $userId,
                            'role' => 'member',
                            'can_edit' => true,
                            'can_delete' => false,
                            'joined_at' => now(),
                        ]);
                    }
                }
            }

            // Add owner as member if not already added
            if (Schema::hasTable('project_members')) {
                $existingMember = DB::table('project_members')
                    ->where('project_id', $projectId)
                    ->where('user_id', $user->id)
                    ->first();
                
                if (!$existingMember) {
                    DB::table('project_members')->insert([
                        'project_id' => $projectId,
                        'user_id' => $user->id,
                        'role' => 'owner',
                        'can_edit' => true,
                        'can_delete' => true,
                        'joined_at' => now(),
                    ]);
                }
            }

            DB::commit();

            // Log activity
            $this->logActivity(
                $projectId,
                null,
                'project',
                'created',
                $user->id,
                null,
                ['name' => $data['name'], 'status' => $data['status']],
                null,
                "Project created: {$data['name']}"
            );

            return response()->json($project, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating project: ' . $e->getMessage());
            return response()->json(['message' => 'Greška pri kreiranju projekta'], 500);
        }
    }

    /**
     * Get single project
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled projekata'], 403);
        }

        $project = DB::table('projects')
            ->select('projects.*', 'users.name as owner_name')
            ->leftJoin('users', 'projects.owner_id', '=', 'users.id')
            ->where('projects.id', $id)
            ->first();

        if (!$project) {
            return response()->json(['message' => 'Project not found'], 404);
        }

        // Get project tasks
        $tasks = DB::table('tasks')
            ->where('project_id', $id)
            ->get();

        $project->tasks = $tasks;

        return response()->json($project);
    }

    /**
     * Update project
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu za izmenu projekata'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:planning,active,on-hold,completed,cancelled',
            'priority' => 'required|in:low,medium,high,urgent',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'progress' => 'nullable|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldProject = DB::table('projects')->find($id);
        
        DB::table('projects')
            ->where('id', $id)
            ->update(array_merge($validator->validated(), ['updated_at' => now()]));

        $project = DB::table('projects')->find($id);

        // Log activity - detect changes
        $changes = [];
        foreach ($validator->validated() as $key => $value) {
            if (isset($oldProject->$key) && $oldProject->$key != $value) {
                $changes[$key] = ['old' => $oldProject->$key, 'new' => $value];
            }
        }

        if (!empty($changes)) {
            $this->logActivity(
                $id,
                null,
                'project',
                'updated',
                $user->id,
                $oldProject,
                $project,
                ['changes' => $changes],
                "Project updated"
            );
        }

        return response()->json($project);
    }

    /**
     * Delete project
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje projekata'], 403);
        }

        // Check if project has tasks
        $tasksCount = DB::table('tasks')->where('project_id', $id)->count();
        
        if ($tasksCount > 0) {
            return response()->json([
                'message' => 'Cannot delete project with existing tasks. Please delete tasks first.'
            ], 422);
        }

        DB::table('projects')->where('id', $id)->delete();

        return response()->json(['message' => 'Project deleted successfully']);
    }

    // ==================== TASKS ====================

    /**
     * Get project tasks
     */
    public function getTasks(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu za pregled taskova'], 403);
        }

        // Build select fields dynamically
        $selectFields = ['tasks.*'];
        $query = DB::table('tasks');
        
        // Only join users table if assigned_to column exists
        if (Schema::hasColumn('tasks', 'assigned_to')) {
            $selectFields[] = 'users.name as assigned_to_name';
            $query->leftJoin('users', 'tasks.assigned_to', '=', 'users.id');
        }
        
        // Join creator table if created_by column exists
        if (Schema::hasColumn('tasks', 'created_by')) {
            $selectFields[] = 'creator.name as created_by_name';
            $query->leftJoin('users as creator', 'tasks.created_by', '=', 'creator.id');
        }
        
        $query->select($selectFields)
            ->where('tasks.project_id', $projectId);
        
        // Only filter by parent_task_id if column exists
        if (Schema::hasColumn('tasks', 'parent_task_id')) {
            $query->whereNull('tasks.parent_task_id'); // Only top-level tasks
        }
        
        $tasks = $query->orderBy('tasks.created_at', 'desc')->get();

        // Get subtasks and additional data for each task
        foreach ($tasks as $task) {
            // Get subtasks only if parent_task_id column exists
            if (Schema::hasColumn('tasks', 'parent_task_id')) {
                $task->subtasks = DB::table('tasks')
                    ->where('parent_task_id', $task->id)
                    ->get();
            } else {
                $task->subtasks = collect();
            }

            // Get multiple assignees if table exists
            if (Schema::hasTable('task_assignees')) {
                $task->assignees = DB::table('task_assignees')
                    ->select('task_assignees.*', 'users.name as user_name', 'users.email as user_email')
                    ->join('users', 'task_assignees.user_id', '=', 'users.id')
                    ->where('task_assignees.task_id', $task->id)
                    ->get();
            }

            // Get comments count
            if (Schema::hasTable('task_comments')) {
                $task->comments_count = DB::table('task_comments')
                    ->where('task_id', $task->id)
                    ->count();
            }
        }

        return response()->json($tasks);
    }

    /**
     * Store new personal task (without project)
     */
    public function storePersonalTask(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in-progress,review,done',
            'priority' => 'required|in:low,medium,high,urgent',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'exists:users,id',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        
        // Build data array
        $data = [
            'project_id' => null, // Personal task, no project
            'created_at' => now(),
            'updated_at' => now(),
        ];
        
        $data['title'] = $validatedData['title'];
        
        if (isset($validatedData['description']) && Schema::hasColumn('tasks', 'description')) {
            $data['description'] = $validatedData['description'];
        }
        
        if (Schema::hasColumn('tasks', 'status')) {
            $data['status'] = $validatedData['status'];
        }
        
        if (Schema::hasColumn('tasks', 'priority')) {
            $data['priority'] = $validatedData['priority'];
        }
        
        if (Schema::hasColumn('tasks', 'created_by')) {
            $data['created_by'] = $user->id;
        }
        
        if (Schema::hasColumn('tasks', 'due_date') && isset($validatedData['due_date'])) {
            $data['due_date'] = $validatedData['due_date'];
        }
        
        if (Schema::hasColumn('tasks', 'start_date') && isset($validatedData['start_date'])) {
            $data['start_date'] = $validatedData['start_date'];
        }
        
        if (Schema::hasColumn('tasks', 'estimated_hours') && isset($validatedData['estimated_hours'])) {
            $data['estimated_hours'] = $validatedData['estimated_hours'];
        }

        // Handle assignees - if no assignees specified, assign to creator (personal task)
        $assigneeIds = $request->input('assignee_ids', []);
        
        if (empty($assigneeIds) && !isset($validatedData['assigned_to'])) {
            // Personal task - assign to creator
            if (Schema::hasColumn('tasks', 'assigned_to')) {
                $data['assigned_to'] = $user->id;
            }
            $assigneeIds = [$user->id];
        } else if (!empty($assigneeIds) && is_array($assigneeIds)) {
            // Multiple assignees provided
            if (Schema::hasColumn('tasks', 'assigned_to')) {
                $data['assigned_to'] = $assigneeIds[0];
            }
        } else if (isset($validatedData['assigned_to'])) {
            // Single assignee provided
            if (Schema::hasColumn('tasks', 'assigned_to')) {
                $data['assigned_to'] = $validatedData['assigned_to'];
            }
            if (Schema::hasTable('task_assignees')) {
                $assigneeIds = [$validatedData['assigned_to']];
            }
        }

        $taskId = DB::table('tasks')->insertGetId($data);
        $task = DB::table('tasks')->find($taskId);

        // Store multiple assignees if provided and table exists
        if (!empty($assigneeIds) && is_array($assigneeIds) && Schema::hasTable('task_assignees')) {
            foreach ($assigneeIds as $assigneeId) {
                DB::table('task_assignees')->insert([
                    'task_id' => $taskId,
                    'user_id' => $assigneeId,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Send notification if not the creator
                if ($assigneeId != $user->id) {
                    try {
                        if (class_exists(NotificationService::class)) {
                            if (method_exists(NotificationService::class, 'taskAssigned')) {
                                NotificationService::taskAssigned(
                                    $assigneeId,
                                    $taskId,
                                    $data['title'],
                                    $user->id
                                );
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Projects: Failed to send task assignment notification', [
                            'error' => $e->getMessage(),
                            'task_id' => $taskId
                        ]);
                    }
                }
            }
        }

        return response()->json($task, 201);
    }

    /**
     * Update personal task
     */
    public function updatePersonalTask(Request $request, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if task exists and belongs to user (is personal task)
        $task = DB::table('tasks')->where('id', $taskId)->whereNull('project_id')->first();
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        // Check if user created the task, is assigned to it, OR if user is admin/manager
        $canEdit = false;
        
        // Check if user is admin/manager/super-admin
        $isAdmin = false;
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                $isAdmin = $user->hasAnyRole(['admin', 'manager', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to check user roles in updatePersonalTask', ['error' => $e->getMessage()]);
            }
        }
        
        if ($isAdmin) {
            $canEdit = true;
        } else {
            if (Schema::hasColumn('tasks', 'created_by') && $task->created_by == $user->id) {
                $canEdit = true;
            }
            if (Schema::hasColumn('tasks', 'assigned_to') && $task->assigned_to == $user->id) {
                $canEdit = true;
            }
            if (Schema::hasColumn('tasks', 'assigned_to_id') && $task->assigned_to_id == $user->id) {
                $canEdit = true;
            }
            if (Schema::hasTable('task_assignees')) {
                $isAssigned = DB::table('task_assignees')
                    ->where('task_id', $taskId)
                    ->where('user_id', $user->id)
                    ->exists();
                if ($isAssigned) {
                    $canEdit = true;
                }
            }
        }

        if (!$canEdit) {
            return response()->json(['message' => 'Nemate dozvolu za izmenu ovog zadatka'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in-progress,review,done',
            'priority' => 'required|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        // Convert empty strings to null for nullable fields
        if (isset($validatedData['description']) && $validatedData['description'] === '') {
            $validatedData['description'] = null;
        }
        if (isset($validatedData['due_date']) && $validatedData['due_date'] === '') {
            $validatedData['due_date'] = null;
        }
        if (isset($validatedData['start_date']) && $validatedData['start_date'] === '') {
            $validatedData['start_date'] = null;
        }
        if (isset($validatedData['estimated_hours']) && $validatedData['estimated_hours'] === '') {
            $validatedData['estimated_hours'] = null;
        }

        // Only update columns that actually exist in the tasks table
        $taskColumns = Schema::getColumnListing('tasks');
        $allowedKeys = array_flip($taskColumns);
        $updateData = array_intersect_key($validatedData, $allowedKeys);

        DB::table('tasks')
            ->where('id', $taskId)
            ->update(array_merge($updateData, ['updated_at' => now()]));

        $updatedTask = DB::table('tasks')->find($taskId);

        return response()->json($updatedTask);
    }

    /**
     * Delete personal task
     */
    public function deletePersonalTask(Request $request, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if task exists and belongs to user (is personal task)
        $task = DB::table('tasks')->where('id', $taskId)->whereNull('project_id')->first();
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        // Check if user created the task OR if user is admin/manager
        $canDelete = false;
        
        // Check if user is admin/manager/super-admin
        $isAdmin = false;
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                $isAdmin = $user->hasAnyRole(['admin', 'manager', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to check user roles in deletePersonalTask', ['error' => $e->getMessage()]);
            }
        }
        
        if ($isAdmin) {
            $canDelete = true;
        } elseif (Schema::hasColumn('tasks', 'created_by') && $task->created_by == $user->id) {
            $canDelete = true;
        }

        if (!$canDelete) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje ovog zadatka'], 403);
        }

        DB::table('tasks')->where('id', $taskId)->delete();

        return response()->json(['message' => 'Task uspešno obrisan']);
    }

    /**
     * Get personal tasks for current user
     */
    public function getPersonalTasks(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        

        $selectFields = ['tasks.*'];
        $query = DB::table('tasks');
        
        // Check for assigned_to or assigned_to_id column
        $assignedToColumn = Schema::hasColumn('tasks', 'assigned_to') ? 'assigned_to' : 
                           (Schema::hasColumn('tasks', 'assigned_to_id') ? 'assigned_to_id' : null);
        
        if ($assignedToColumn) {
            $selectFields[] = 'users.name as assigned_to_name';
            $query->leftJoin('users', "tasks.{$assignedToColumn}", '=', 'users.id');
        }
        
        if (Schema::hasColumn('tasks', 'created_by')) {
            $selectFields[] = 'creator.name as created_by_name';
            $query->leftJoin('users as creator', 'tasks.created_by', '=', 'creator.id');
        }
        
        // Get tasks where project_id is null and user is assigned or created the task
        $query->select($selectFields)
            ->whereNull('tasks.project_id');
        
        // Base filter: show tasks based on filter type
        $filter = $request->input('filter');
        
        // Check if user is admin/manager/super-admin
        $isAdmin = false;
        if ($user && method_exists($user, 'hasAnyRole')) {
            try {
                $isAdmin = $user->hasAnyRole(['admin', 'manager', 'super-admin']);
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to check user roles in getPersonalTasks', ['error' => $e->getMessage()]);
            }
        }
        
        // Check for assigned_to or assigned_to_id column (used throughout the filter logic)
        $assignedToColumn = Schema::hasColumn('tasks', 'assigned_to') ? 'assigned_to' : 
                           (Schema::hasColumn('tasks', 'assigned_to_id') ? 'assigned_to_id' : null);
        
        // Filter: tasks that je korisnik dodijelio drugim korisnicima (kreirani / dodijeljeni za druge)
        if ($filter === 'created-for-others') {
            if (Schema::hasTable('task_assignees')) {
                $taskIds = DB::table('task_assignees')
                    ->where('assigned_by', $user->id)
                    ->where('user_id', '!=', $user->id)
                    ->distinct()
                    ->pluck('task_id')
                    ->toArray();
                
                if (!empty($taskIds)) {
                    $query->whereIn('tasks.id', $taskIds);
                } else {
                    // Ako nema takvih zadataka, vrati prazan skup
                    $query->whereRaw('1 = 0');
                }
            } else {
                // Ako nema tabele task_assignees, nema pouzdanog načina da znamo kome je zadatak dodijeljen
                $query->whereRaw('1 = 0');
            }
        } else if ($filter === 'assigned-to-me') {
            // Show only tasks created by others but assigned to user
            $query->where(function($q) use ($user, $assignedToColumn) {
                // Task should be created by someone else
                if (Schema::hasColumn('tasks', 'created_by')) {
                    $q->where('tasks.created_by', '!=', $user->id)
                      ->whereNotNull('tasks.created_by');
                }
                
                // Task should be assigned to user
                if ($assignedToColumn) {
                    $q->where("tasks.{$assignedToColumn}", $user->id);
                }
                
                // Also check task_assignees table
                if (Schema::hasTable('task_assignees')) {
                    $assignedTaskIds = DB::table('task_assignees')
                        ->where('user_id', $user->id)
                        ->pluck('task_id')
                        ->toArray();
                    
                    if (!empty($assignedTaskIds)) {
                        if ($assignedToColumn) {
                            $q->orWhereIn('tasks.id', $assignedTaskIds);
                        } else {
                            $q->whereIn('tasks.id', $assignedTaskIds);
                        }
                    }
                }
            });
        } else {
            // Check if user is admin/manager/super-admin - if yes, show all tasks
            $isAdmin = false;
            if ($user && method_exists($user, 'hasAnyRole')) {
                try {
                    $isAdmin = $user->hasAnyRole(['admin', 'manager', 'super-admin']);
                } catch (\Exception $e) {
                    Log::warning('Projects: Failed to check user roles in getPersonalTasks', ['error' => $e->getMessage()]);
                }
            }
            
            if (!$isAdmin) {
                // Default: show all tasks (created by user OR assigned to user)
                $query->where(function($q) use ($user, $assignedToColumn) {
                    $hasFirstCondition = false;
                    
                    // Start with created_by check - user should see all tasks they created
                    if (Schema::hasColumn('tasks', 'created_by')) {
                        $q->where('tasks.created_by', $user->id);
                        $hasFirstCondition = true;
                    }
                    
                    // Also include tasks assigned to user
                    if ($assignedToColumn) {
                        if ($hasFirstCondition) {
                            $q->orWhere("tasks.{$assignedToColumn}", $user->id);
                        } else {
                            $q->where("tasks.{$assignedToColumn}", $user->id);
                            $hasFirstCondition = true;
                        }
                    }

                    // Also check task_assignees table for multiple assignees
                    if (Schema::hasTable('task_assignees')) {
                        $assignedTaskIds = DB::table('task_assignees')
                            ->where('user_id', $user->id)
                            ->pluck('task_id')
                            ->toArray();
                        
                        if (!empty($assignedTaskIds)) {
                            if ($hasFirstCondition) {
                                $q->orWhereIn('tasks.id', $assignedTaskIds);
                            } else {
                                $q->whereIn('tasks.id', $assignedTaskIds);
                            }
                        }
                    }
                });
            }
            // If admin, don't add any filter - show all personal tasks
        }

        // Simple search (by title and description) - must be applied after base filter
        if ($request->has('search') && $request->input('search')) {
            $search = trim($request->input('search'));
            if (!empty($search)) {
                // Search in title or description - must be grouped to work correctly with base filter
                $query->where(function($q) use ($search) {
                    $q->where('tasks.title', 'like', "%{$search}%");
                    if (Schema::hasColumn('tasks', 'description')) {
                        $q->orWhere('tasks.description', 'like', "%{$search}%");
                    }
                });
            }
        }
        
        $query->distinct();

        // Advanced search filters
        if ($request->has('status') && $request->input('status')) {
            $query->where('tasks.status', $request->input('status'));
        }

        if ($request->has('priority') && $request->input('priority')) {
            $query->where('tasks.priority', $request->input('priority'));
        }

        if ($request->has('date_from') && $request->input('date_from')) {
            if (Schema::hasColumn('tasks', 'start_date')) {
                $query->where(function($q) use ($request) {
                    $q->whereDate('tasks.start_date', '>=', $request->input('date_from'))
                      ->orWhereDate('tasks.due_date', '>=', $request->input('date_from'))
                      ->orWhereDate('tasks.created_at', '>=', $request->input('date_from'));
                });
            } else {
                $query->where(function($q) use ($request) {
                    $q->whereDate('tasks.due_date', '>=', $request->input('date_from'))
                      ->orWhereDate('tasks.created_at', '>=', $request->input('date_from'));
                });
            }
        }

        if ($request->has('date_to') && $request->input('date_to')) {
            if (Schema::hasColumn('tasks', 'start_date')) {
                $query->where(function($q) use ($request) {
                    $q->whereDate('tasks.start_date', '<=', $request->input('date_to'))
                      ->orWhereDate('tasks.due_date', '<=', $request->input('date_to'))
                      ->orWhereDate('tasks.created_at', '<=', $request->input('date_to'));
                });
            } else {
                $query->where(function($q) use ($request) {
                    $q->whereDate('tasks.due_date', '<=', $request->input('date_to'))
                      ->orWhereDate('tasks.created_at', '<=', $request->input('date_to'));
                });
            }
        }

        // Filter by assignees
        if ($request->has('assignee_ids') && is_array($request->input('assignee_ids')) && !empty($request->input('assignee_ids'))) {
            $assigneeIds = $request->input('assignee_ids');
            $query->where(function($q) use ($assigneeIds) {
                if (Schema::hasColumn('tasks', 'assigned_to')) {
                    $q->whereIn('tasks.assigned_to', $assigneeIds);
                }
                if (Schema::hasTable('task_assignees')) {
                    $taskIds = DB::table('task_assignees')
                        ->whereIn('user_id', $assigneeIds)
                        ->pluck('task_id')
                        ->toArray();
                    if (!empty($taskIds)) {
                        $q->orWhereIn('tasks.id', $taskIds);
                    }
                }
            });
        }
        
        $tasks = $query->orderBy('tasks.created_at', 'desc')->get();

        // Add assignees for each task
        foreach ($tasks as $task) {
            if (Schema::hasTable('task_assignees')) {
                $taskAssignees = DB::table('task_assignees')
                    ->join('users', 'task_assignees.user_id', '=', 'users.id')
                    ->where('task_assignees.task_id', $task->id)
                    ->select('users.id as user_id', 'users.name as user_name', 'users.email as user_email')
                    ->get();
                $task->assignees = $taskAssignees;
            }
        }

        return response()->json($tasks);
    }

    /**
     * Store new task
     */
    public function storeTask(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu za kreiranje taskova'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_task_id' => 'nullable|exists:tasks,id',
            'status' => 'required|in:todo,in-progress,review,done',
            'priority' => 'required|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id', // Fixed: was assigned_to_id, should be assigned_to
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        
        // Build data array with column existence checks
        $data = [
            'project_id' => $projectId,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        
        // Add title (required)
        $data['title'] = $validatedData['title'];
        
        // Add optional fields only if columns exist
        if (isset($validatedData['description']) && Schema::hasColumn('tasks', 'description')) {
            $data['description'] = $validatedData['description'];
        }
        
        if (Schema::hasColumn('tasks', 'status')) {
            $data['status'] = $validatedData['status'];
        }
        
        if (Schema::hasColumn('tasks', 'priority')) {
            $data['priority'] = $validatedData['priority'];
        }
        
        if (Schema::hasColumn('tasks', 'created_by')) {
            $data['created_by'] = $user->id;
        }
        
        if (Schema::hasColumn('tasks', 'parent_task_id') && isset($validatedData['parent_task_id'])) {
            $data['parent_task_id'] = $validatedData['parent_task_id'];
        }
        
        if (Schema::hasColumn('tasks', 'due_date') && isset($validatedData['due_date'])) {
            $data['due_date'] = $validatedData['due_date'];
        }
        
        if (Schema::hasColumn('tasks', 'estimated_hours') && isset($validatedData['estimated_hours'])) {
            $data['estimated_hours'] = $validatedData['estimated_hours'];
        }

        // Handle assignees
        $assigneeIds = $request->input('assignee_ids', []);
        
        // If multiple assignees provided, use first one for assigned_to column
        if (!empty($assigneeIds) && is_array($assigneeIds) && Schema::hasColumn('tasks', 'assigned_to')) {
            $data['assigned_to'] = $assigneeIds[0];
        } else if (isset($validatedData['assigned_to']) && Schema::hasColumn('tasks', 'assigned_to')) {
            // If single assignee provided directly
            $data['assigned_to'] = $validatedData['assigned_to'];
            // Also add to assigneeIds array for task_assignees table
            if (Schema::hasTable('task_assignees')) {
                $assigneeIds = [$validatedData['assigned_to']];
            }
        }
        
        $taskId = DB::table('tasks')->insertGetId($data);
        $task = DB::table('tasks')->find($taskId);

        // Store multiple assignees if provided and table exists
        if (!empty($assigneeIds) && is_array($assigneeIds) && Schema::hasTable('task_assignees')) {
            foreach ($assigneeIds as $assigneeId) {
                DB::table('task_assignees')->insert([
                    'task_id' => $taskId,
                    'user_id' => $assigneeId,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Send notification
                try {
                    if (class_exists(NotificationService::class) && method_exists(NotificationService::class, 'taskAssigned')) {
                        NotificationService::taskAssigned(
                            $assigneeId,
                            $taskId,
                            $data['title'],
                            $user->id
                        );
                    }
                } catch (\Exception $e) {
                    Log::warning('Projects: Failed to send task assignment notification', [
                        'error' => $e->getMessage(),
                        'task_id' => $taskId
                    ]);
                }

                // Send notification
                try {
                    if (class_exists(NotificationService::class) && method_exists(NotificationService::class, 'taskAssigned')) {
                        if (NotificationService::isNotificationEnabled($assigneeId, 'task_assignments')) {
                            NotificationService::taskAssigned(
                                $assigneeId,
                                $taskId,
                                $data['title'],
                                $user->id
                            );
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Projects: Failed to send task assignment notification', [
                        'error' => $e->getMessage(),
                        'task_id' => $taskId
                    ]);
                }

                // Log activity for each assignee
                $this->logActivity(
                    $projectId,
                    $taskId,
                    'task',
                    'assigned',
                    $user->id,
                    null,
                    ['user_id' => $assigneeId],
                    null,
                    "User assigned to task"
                );
            }

            // Create or get task chat thread
            try {
                if (class_exists(ChatService::class) && Schema::hasTable('chat_conversations')) {
                    $this->getOrCreateTaskThread($taskId, $projectId, $assigneeIds, $user->id);
                }
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to create task chat thread', [
                    'error' => $e->getMessage(),
                    'task_id' => $taskId
                ]);
            }
        } else if (!empty($data['assigned_to'])) {
            // Fallback to single assignee notification
            try {
                if (class_exists(NotificationService::class) && method_exists(NotificationService::class, 'taskAssigned')) {
                    NotificationService::taskAssigned(
                        $data['assigned_to'],
                        $taskId,
                        $data['title'],
                        $user->id
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Projects: Failed to send task assignment notification', [
                    'error' => $e->getMessage(),
                    'task_id' => $taskId
                ]);
            }
        }

        // Log activity for task creation
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'created',
            $user->id,
            null,
            ['title' => $data['title'], 'status' => $data['status']],
            null,
            "Task created: {$data['title']}"
        );

        // Update project progress
        $this->updateProjectProgress($projectId);

        return response()->json($task, 201);
    }

    /**
     * Update task
     */
    public function updateTask(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu za izmenu taskova'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in-progress,review,done',
            'priority' => 'required|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id', // Fixed: was assigned_to_id, should be assigned_to
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'actual_hours' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldTask = DB::table('tasks')->find($taskId);
        if (!$oldTask) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $validatedData = $validator->validated();
        
        // Handle status change separately for activity log
        $statusChanged = false;
        if (isset($validatedData['status']) && $oldTask->status != $validatedData['status']) {
            $statusChanged = true;
        }

        // Build update array only with columns that exist in tasks table (avoid "Unknown column" errors)
        $data = ['updated_at' => now()];
        $taskColumns = ['title', 'description', 'status', 'priority', 'due_date', 'estimated_hours', 'actual_hours'];
        foreach ($taskColumns as $col) {
            if (array_key_exists($col, $validatedData) && Schema::hasColumn('tasks', $col)) {
                $data[$col] = $validatedData[$col];
            }
        }
        if (array_key_exists('assigned_to', $validatedData) && Schema::hasColumn('tasks', 'assigned_to')) {
            $data['assigned_to'] = $validatedData['assigned_to'];
        }

        DB::table('tasks')->where('id', $taskId)->update($data);

        // If assigned_to was sent but tasks table has no assigned_to column, sync task_assignees instead
        if (array_key_exists('assigned_to', $validatedData) && !Schema::hasColumn('tasks', 'assigned_to') && Schema::hasTable('task_assignees')) {
            $userId = $validatedData['assigned_to'] ? (int) $validatedData['assigned_to'] : null;
            DB::table('task_assignees')->where('task_id', $taskId)->delete();
            if ($userId) {
                DB::table('task_assignees')->insert([
                    'task_id' => $taskId,
                    'user_id' => $userId,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $task = DB::table('tasks')->find($taskId);

        // Log activity - detect changes
        $changes = [];
        foreach ($validatedData as $key => $value) {
            if (isset($oldTask->$key) && $oldTask->$key != $value) {
                $changes[$key] = ['old' => $oldTask->$key, 'new' => $value];
            }
        }

        if (!empty($changes)) {
            $action = $statusChanged ? 'status_changed' : 'updated';
            $this->logActivity(
                $projectId,
                $taskId,
                'task',
                $action,
                $user->id,
                $oldTask,
                $task,
                ['changes' => $changes],
                $statusChanged ? "Task status changed from {$oldTask->status} to {$validatedData['status']}" : "Task updated"
            );

            // Send status change notification to assignees
            if ($statusChanged) {
                try {
                    $assigneeIds = [];
                    // Get assignees from task_assignees table if exists
                    if (Schema::hasTable('task_assignees')) {
                        $assigneeIds = DB::table('task_assignees')
                            ->where('task_id', $taskId)
                            ->pluck('user_id')
                            ->toArray();
                    }
                    
                    // Fallback to single assignee
                    if (empty($assigneeIds) && !empty($task->assigned_to)) {
                        $assigneeIds = [$task->assigned_to];
                    }

                    // Remove the user who made the change to avoid self-notification
                    $assigneeIds = array_filter($assigneeIds, fn($id) => $id != $user->id);

                    if (!empty($assigneeIds) && class_exists(NotificationService::class)) {
                        $userName = DB::table('users')->where('id', $user->id)->value('name') ?? 'Someone';
                        foreach ($assigneeIds as $assigneeId) {
                            if (NotificationService::isNotificationEnabled($assigneeId, 'task_assignments')) {
                                NotificationService::create(
                                    $assigneeId,
                                    'task_status_changed',
                                    'Task Status Changed',
                                    "{$userName} changed status of task '{$task->title}' from {$oldTask->status} to {$validatedData['status']}",
                                    "/projects/{$projectId}/tasks/{$taskId}"
                                );
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Projects: Failed to send status change notification', [
                        'error' => $e->getMessage(),
                        'task_id' => $taskId
                    ]);
                }
            }
        }

        // Update project progress
        $this->updateProjectProgress($projectId);

        return response()->json($task);
    }

    /**
     * Delete task
     */
    public function deleteTask(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check permission
        if (!$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje taskova'], 403);
        }

        // Get task for activity log
        $task = DB::table('tasks')->find($taskId);
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        // Delete subtasks first
        DB::table('tasks')->where('parent_task_id', $taskId)->delete();
        
        // Delete main task
        DB::table('tasks')->where('id', $taskId)->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'deleted',
            $user->id,
            (array)$task,
            null,
            null,
            "Task deleted: {$task->title}"
        );

        // Update project progress
        $this->updateProjectProgress($projectId);

        return response()->json(['message' => 'Task deleted successfully']);
    }

    /**
     * Update project progress based on completed tasks
     */
    private function updateProjectProgress($projectId)
    {
        $totalTasks = DB::table('tasks')->where('project_id', $projectId)->count();
        
        if ($totalTasks === 0) {
            return;
        }

        $completedTasks = DB::table('tasks')
            ->where('project_id', $projectId)
            ->where('status', 'done')
            ->count();

        $progress = round(($completedTasks / $totalTasks) * 100);

        DB::table('projects')
            ->where('id', $projectId)
            ->update(['progress' => $progress, 'updated_at' => now()]);
    }

    /**
     * Log activity for project or task
     */
    private function logActivity($projectId, $taskId, $entityType, $action, $userId, $oldValue = null, $newValue = null, $metadata = null, $description = null)
    {
        if (!Schema::hasTable('project_activities')) {
            return;
        }

        try {
            // Convert objects to arrays for JSON encoding
            $oldValueJson = null;
            if ($oldValue !== null) {
                if (is_object($oldValue)) {
                    $oldValueJson = json_encode((array)$oldValue);
                } else {
                    $oldValueJson = json_encode($oldValue);
                }
            }

            $newValueJson = null;
            if ($newValue !== null) {
                if (is_object($newValue)) {
                    $newValueJson = json_encode((array)$newValue);
                } else {
                    $newValueJson = json_encode($newValue);
                }
            }

            $metadataJson = null;
            if ($metadata !== null) {
                $metadataJson = json_encode($metadata);
            }

            DB::table('project_activities')->insert([
                'project_id' => $projectId,
                'task_id' => $taskId,
                'entity_type' => $entityType, // 'project' or 'task'
                'action' => $action, // 'created', 'updated', 'status_changed', 'assigned', 'commented', etc.
                'user_id' => $userId,
                'old_value' => $oldValueJson,
                'new_value' => $newValueJson,
                'metadata' => $metadataJson,
                'description' => $description,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('Projects: Failed to log activity', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
                'task_id' => $taskId,
            ]);
        }
    }

    /**
     * Get or create chat thread for task
     */
    private function getOrCreateTaskThread($taskId, $projectId, $assigneeIds = [], $createdBy = null)
    {
        try {
            if (!Schema::hasTable('chat_conversations')) {
                return null;
            }

            // Get task details first
            $task = DB::table('tasks')->find($taskId);
            if (!$task) {
                return null;
            }

            // Check if conversation already exists for this task
            // Use name pattern with task_id embedded: "Task #{task_id}: {title}"
            $conversationId = DB::table('chat_conversations')
                ->where('type', 'task')
                ->where('project_id', $projectId)
                ->where(function($query) use ($taskId, $task) {
                    $query->where('name', "LIKE", "Task #{$taskId}:%")
                          ->orWhere('name', "Task: {$task->title}");
                })
                ->value('id');

            if ($conversationId) {
                return $conversationId;
            }

            // Get task details
            $task = DB::table('tasks')->find($taskId);
            if (!$task) {
                return null;
            }

            // Get participants: assignees + creator + project members (optional)
            $participantIds = array_unique(array_filter(array_merge(
                $assigneeIds ?: [],
                $task->assigned_to ? [$task->assigned_to] : [],
                $createdBy ? [$createdBy] : [],
                $task->created_by ? [$task->created_by] : []
            )));

            if (empty($participantIds)) {
                // Fallback to project members
                if (Schema::hasTable('project_members')) {
                    $participantIds = DB::table('project_members')
                        ->where('project_id', $projectId)
                        ->pluck('user_id')
                        ->toArray();
                }
            }

            if (empty($participantIds)) {
                return null;
            }

            // Create conversation with task_id in name for identification
            $conversationId = DB::table('chat_conversations')->insertGetId([
                'type' => 'task',
                'name' => "Task #{$taskId}: {$task->title}",
                'project_id' => $projectId,
                'created_by' => $createdBy ?? ($participantIds[0] ?? 1),
                'last_message_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Add participants
            foreach ($participantIds as $userId) {
                DB::table('chat_participants')->insert([
                    'conversation_id' => $conversationId,
                    'user_id' => $userId,
                    'joined_at' => now(),
                ]);
            }

            return $conversationId;
        } catch (\Exception $e) {
            Log::warning('Projects: Failed to get/create task thread', [
                'error' => $e->getMessage(),
                'task_id' => $taskId
            ]);
            return null;
        }
    }

    /**
     * Parse @mentions from comment text and return array of user IDs
     */
    private function parseMentions($commentText)
    {
        $mentionPattern = '/@(\w+)/';
        $matches = [];
        preg_match_all($mentionPattern, $commentText, $matches);
        
        if (empty($matches[1])) {
            return [];
        }

        $userIds = [];
        foreach ($matches[1] as $username) {
            $user = DB::table('users')
                ->where('email', 'like', "%{$username}%")
                ->orWhere('name', 'like', "%{$username}%")
                ->first();
            
            if ($user) {
                $userIds[] = $user->id;
            }
        }

        return array_unique($userIds);
    }

    // ==================== TASK ASSIGNEES ====================

    /**
     * Get task assignees
     */
    public function getTaskAssignees(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_assignees')) {
            return response()->json([]);
        }

        $assignees = DB::table('task_assignees')
            ->select('task_assignees.*', 'users.name as user_name', 'users.email as user_email')
            ->join('users', 'task_assignees.user_id', '=', 'users.id')
            ->where('task_assignees.task_id', $taskId)
            ->get();

        return response()->json($assignees);
    }

    /**
     * Add assignees to task
     */
    public function addTaskAssignees(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Schema::hasTable('task_assignees')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        // Get old assignees for activity log
        $oldAssignees = DB::table('task_assignees')
            ->where('task_id', $taskId)
            ->pluck('user_id')
            ->toArray();

        // Remove existing assignees (optional - or just add new ones)
        // DB::table('task_assignees')->where('task_id', $taskId)->delete();

        $userIds = $request->input('user_ids');
        $newAssignees = [];

        foreach ($userIds as $userId) {
            // Check if already assigned
            $exists = DB::table('task_assignees')
                ->where('task_id', $taskId)
                ->where('user_id', $userId)
                ->exists();

            if (!$exists) {
                DB::table('task_assignees')->insert([
                    'task_id' => $taskId,
                    'user_id' => $userId,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $newAssignees[] = $userId;

                // Log activity
                $this->logActivity(
                    $projectId,
                    $taskId,
                    'task',
                    'assigned',
                    $user->id,
                    null,
                    ['user_id' => $userId],
                    null,
                    "User assigned to task"
                );
            }
        }

        // Log activity for bulk assignment
        if (!empty($newAssignees)) {
            $this->logActivity(
                $projectId,
                $taskId,
                'task',
                'assignees_updated',
                $user->id,
                ['assignees' => $oldAssignees],
                ['assignees' => array_merge($oldAssignees, $newAssignees)],
                null,
                "Task assignees updated"
            );
        }

        return response()->json(['message' => 'Assignees added successfully', 'new_assignees' => $newAssignees], 201);
    }

    /**
     * Remove assignee from task
     */
    public function removeTaskAssignee(Request $request, $projectId, $taskId, $userId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_assignees')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        DB::table('task_assignees')
            ->where('task_id', $taskId)
            ->where('user_id', $userId)
            ->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'unassigned',
            $user->id,
            ['user_id' => $userId],
            null,
            null,
            "User unassigned from task"
        );

        return response()->json(['message' => 'Assignee removed successfully']);
    }

    // ==================== TASK COMMENTS ====================

    /**
     * Get task comments
     */
    public function getTaskComments(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_comments')) {
            return response()->json([]);
        }

        $comments = DB::table('task_comments')
            ->select(
                'task_comments.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->join('users', 'task_comments.user_id', '=', 'users.id')
            ->where('task_comments.task_id', $taskId)
            ->orderBy('task_comments.created_at', 'asc')
            ->get();

        // Get mentions for each comment
        if (Schema::hasTable('task_comment_mentions')) {
            foreach ($comments as $comment) {
                $mentions = DB::table('task_comment_mentions')
                    ->select('task_comment_mentions.*', 'users.name as mentioned_user_name', 'users.email as mentioned_user_email')
                    ->join('users', 'task_comment_mentions.user_id', '=', 'users.id')
                    ->where('task_comment_mentions.comment_id', $comment->id)
                    ->get();
                $comment->mentions_list = $mentions;
            }
        }

        return response()->json($comments);
    }

    /**
     * Store task comment
     */
    public function storeTaskComment(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'create')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'comment' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify task exists
        $task = DB::table('tasks')->find($taskId);
        if (!$task || $task->project_id != $projectId) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        if (!Schema::hasTable('task_comments')) {
            Log::warning('task_comments table does not exist, attempting to create', [
                'task_id' => $taskId,
                'project_id' => $projectId
            ]);
            
            try {
                // Create table without foreign keys first
                Schema::create('task_comments', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('task_id');
                    $table->unsignedBigInteger('user_id');
                    $table->text('comment');
                    $table->timestamps();
                    
                    $table->index('task_id');
                    $table->index('user_id');
                });
                
                // Add foreign keys if referenced tables exist
                if (Schema::hasTable('tasks')) {
                    try {
                        Schema::table('task_comments', function (Blueprint $table) {
                            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
                        });
                    } catch (\Exception $e) {
                        Log::warning('Could not add foreign key for task_id', ['error' => $e->getMessage()]);
                    }
                }
                
                if (Schema::hasTable('users')) {
                    try {
                        Schema::table('task_comments', function (Blueprint $table) {
                            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                        });
                    } catch (\Exception $e) {
                        Log::warning('Could not add foreign key for user_id', ['error' => $e->getMessage()]);
                    }
                }
                
                Log::info('task_comments table created successfully');
            } catch (\Exception $e) {
                Log::error('Failed to create task_comments table', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'message' => 'Tabela za komentare ne postoji i ne može biti kreirana. Molimo pokrenite migracije: php artisan migrate',
                    'error' => $e->getMessage()
                ], 501);
            }
        }

        $commentText = $request->input('comment');
        $mentionedUserIds = $this->parseMentions($commentText);

        $commentData = [
            'task_id' => $taskId,
            'user_id' => $user->id,
            'comment' => $commentText,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // Add mentions JSON if column exists
        if (Schema::hasColumn('task_comments', 'mentions')) {
            $commentData['mentions'] = json_encode($mentionedUserIds);
        }

        try {
            $commentId = DB::table('task_comments')->insertGetId($commentData);
        } catch (\Exception $e) {
            Log::error('Failed to insert task comment', [
                'error' => $e->getMessage(),
                'task_id' => $taskId,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Greška pri čuvanju komentara: ' . $e->getMessage()
            ], 500);
        }

        // Store mentions in task_comment_mentions table
        if (Schema::hasTable('task_comment_mentions') && !empty($mentionedUserIds)) {
            foreach ($mentionedUserIds as $mentionedUserId) {
                DB::table('task_comment_mentions')->insert([
                    'comment_id' => $commentId,
                    'user_id' => $mentionedUserId,
                    'mentioned_by' => $user->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Send notification to mentioned user
                try {
                    if (class_exists(NotificationService::class)) {
                        $task = DB::table('tasks')->find($taskId);
                        NotificationService::userMentioned(
                            $mentionedUserId,
                            "task '{$task->title}'",
                            $user->name,
                            "/projects/{$projectId}/tasks/{$taskId}"
                        );
                    }
                } catch (\Exception $e) {
                    Log::warning('Projects: Failed to send mention notification', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'commented',
            $user->id,
            null,
            ['comment_id' => $commentId, 'has_mentions' => !empty($mentionedUserIds)],
            null,
            "Comment added to task"
        );

        // Post comment to task chat thread if exists
        try {
            if (class_exists(ChatService::class) && Schema::hasTable('chat_conversations')) {
                $task = DB::table('tasks')->find($taskId);
                if ($task) {
                    $conversationId = $this->getOrCreateTaskThread($taskId, $projectId, [], $user->id);
                    if ($conversationId) {
                        // Post comment as message to chat thread
                        ChatService::sendMessage($conversationId, $user->id, $commentText);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('Projects: Failed to post comment to task chat thread', [
                'error' => $e->getMessage(),
                'task_id' => $taskId
            ]);
        }

        $comment = DB::table('task_comments')
            ->select('task_comments.*', 'users.name as user_name', 'users.email as user_email')
            ->join('users', 'task_comments.user_id', '=', 'users.id')
            ->where('task_comments.id', $commentId)
            ->first();

        return response()->json($comment, 201);
    }

    /**
     * Update task comment
     */
    public function updateTaskComment(Request $request, $projectId, $taskId, $commentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'comment' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Schema::hasTable('task_comments')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        // Check if comment exists and belongs to user
        $comment = DB::table('task_comments')->find($commentId);
        if (!$comment || $comment->task_id != $taskId) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        // Only comment owner can edit
        if ($comment->user_id != $user->id && !$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za izmenu ovog komentara'], 403);
        }

        $commentText = $request->input('comment');
        $mentionedUserIds = $this->parseMentions($commentText);

        $updateData = [
            'comment' => $commentText,
            'updated_at' => now(),
        ];

        // Update mentions if column exists
        if (Schema::hasColumn('task_comments', 'mentions')) {
            $updateData['mentions'] = json_encode($mentionedUserIds);
        }

        if (Schema::hasColumn('task_comments', 'is_edited')) {
            $updateData['is_edited'] = true;
        }

        if (Schema::hasColumn('task_comments', 'edited_at')) {
            $updateData['edited_at'] = now();
        }

        DB::table('task_comments')->where('id', $commentId)->update($updateData);

        // Update mentions in task_comment_mentions table
        if (Schema::hasTable('task_comment_mentions')) {
            // Remove old mentions
            DB::table('task_comment_mentions')->where('comment_id', $commentId)->delete();

            // Add new mentions
            if (!empty($mentionedUserIds)) {
                foreach ($mentionedUserIds as $mentionedUserId) {
                    DB::table('task_comment_mentions')->insert([
                        'comment_id' => $commentId,
                        'user_id' => $mentionedUserId,
                        'mentioned_by' => $user->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'comment_updated',
            $user->id,
            null,
            ['comment_id' => $commentId],
            null,
            "Comment updated"
        );

        $updatedComment = DB::table('task_comments')
            ->select('task_comments.*', 'users.name as user_name', 'users.email as user_email')
            ->join('users', 'task_comments.user_id', '=', 'users.id')
            ->where('task_comments.id', $commentId)
            ->first();

        return response()->json($updatedComment);
    }

    /**
     * Delete task comment
     */
    public function deleteTaskComment(Request $request, $projectId, $taskId, $commentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_comments')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        // Check if comment exists and belongs to task
        $comment = DB::table('task_comments')->find($commentId);
        if (!$comment || $comment->task_id != $taskId) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        // Only comment owner or admin can delete
        if ($comment->user_id != $user->id && !$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje ovog komentara'], 403);
        }

        // Delete mentions first (cascade should handle this, but be safe)
        if (Schema::hasTable('task_comment_mentions')) {
            DB::table('task_comment_mentions')->where('comment_id', $commentId)->delete();
        }

        DB::table('task_comments')->where('id', $commentId)->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'comment_deleted',
            $user->id,
            ['comment_id' => $commentId],
            null,
            null,
            "Comment deleted"
        );

        return response()->json(['message' => 'Comment deleted successfully']);
    }

    // ==================== PROJECT ACTIVITIES ====================

    /**
     * Get project activities
     */
    public function getProjectActivities(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('project_activities')) {
            return response()->json([]);
        }

        $taskId = $request->input('task_id');
        $entityType = $request->input('entity_type'); // 'project' or 'task'

        $query = DB::table('project_activities')
            ->select(
                'project_activities.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->join('users', 'project_activities.user_id', '=', 'users.id')
            ->where('project_activities.project_id', $projectId);

        if ($taskId) {
            $query->where('project_activities.task_id', $taskId);
        }

        if ($entityType) {
            $query->where('project_activities.entity_type', $entityType);
        }

        $activities = $query->orderBy('project_activities.created_at', 'desc')
            ->paginate($request->input('per_page', 50));

        // Decode JSON fields
        foreach ($activities->items() as $activity) {
            if ($activity->old_value) {
                $activity->old_value = json_decode($activity->old_value, true);
            }
            if ($activity->new_value) {
                $activity->new_value = json_decode($activity->new_value, true);
            }
            if ($activity->metadata) {
                $activity->metadata = json_decode($activity->metadata, true);
            }
        }

        return response()->json($activities);
    }

    // ==================== TASK DEPENDENCIES ====================

    /**
     * Get task dependencies
     */
    public function getTaskDependencies(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_dependencies')) {
            return response()->json([]);
        }

        $dependencies = DB::table('task_dependencies')
            ->select(
                'task_dependencies.*',
                'depends_on_task.title as depends_on_task_title',
                'depends_on_task.status as depends_on_task_status'
            )
            ->join('tasks as depends_on_task', 'task_dependencies.depends_on_task_id', '=', 'depends_on_task.id')
            ->where('task_dependencies.task_id', $taskId)
            ->get();

        return response()->json($dependencies);
    }

    /**
     * Add task dependency
     */
    public function addTaskDependency(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'depends_on_task_id' => 'required|exists:tasks,id',
            'type' => 'required|in:finish_to_start,start_to_start,finish_to_finish,start_to_finish',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Schema::hasTable('task_dependencies')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        // Prevent circular dependencies
        $dependsOnTaskId = $request->input('depends_on_task_id');
        if ($dependsOnTaskId == $taskId) {
            return response()->json(['message' => 'Task cannot depend on itself'], 422);
        }

        // Check if dependency already exists
        $exists = DB::table('task_dependencies')
            ->where('task_id', $taskId)
            ->where('depends_on_task_id', $dependsOnTaskId)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Dependency already exists'], 422);
        }

        // Check for circular dependency (simplified check)
        $circular = DB::table('task_dependencies')
            ->where('task_id', $dependsOnTaskId)
            ->where('depends_on_task_id', $taskId)
            ->exists();

        if ($circular) {
            return response()->json(['message' => 'Circular dependency detected'], 422);
        }

        $dependencyId = DB::table('task_dependencies')->insertGetId([
            'task_id' => $taskId,
            'depends_on_task_id' => $dependsOnTaskId,
            'type' => $request->input('type'),
        ]);

        $dependency = DB::table('task_dependencies')
            ->select(
                'task_dependencies.*',
                'depends_on_task.title as depends_on_task_title',
                'depends_on_task.status as depends_on_task_status'
            )
            ->join('tasks as depends_on_task', 'task_dependencies.depends_on_task_id', '=', 'depends_on_task.id')
            ->where('task_dependencies.id', $dependencyId)
            ->first();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'dependency_added',
            $user->id,
            null,
            ['depends_on_task_id' => $dependsOnTaskId, 'type' => $request->input('type')],
            null,
            "Task dependency added"
        );

        return response()->json($dependency, 201);
    }

    /**
     * Remove task dependency
     */
    public function removeTaskDependency(Request $request, $projectId, $taskId, $dependencyId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        if (!Schema::hasTable('task_dependencies')) {
            return response()->json(['message' => 'Feature not available'], 501);
        }

        $dependency = DB::table('task_dependencies')
            ->where('id', $dependencyId)
            ->where('task_id', $taskId)
            ->first();

        if (!$dependency) {
            return response()->json(['message' => 'Dependency not found'], 404);
        }

        DB::table('task_dependencies')->where('id', $dependencyId)->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'dependency_removed',
            $user->id,
            ['depends_on_task_id' => $dependency->depends_on_task_id],
            null,
            null,
            "Task dependency removed"
        );

        return response()->json(['message' => 'Dependency removed successfully']);
    }

    // ==================== TASK ATTACHMENTS ====================

    /**
     * Ensure task_attachments table exists (create if missing).
     */
    protected function ensureTaskAttachmentsTable(): void
    {
        if (Schema::hasTable('task_attachments')) {
            return;
        }
        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id');
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamps();
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    /**
     * Get task attachments
     */
    public function getTaskAttachments(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $this->ensureTaskAttachmentsTable();

        $attachments = DB::table('task_attachments')
            ->select(
                'task_attachments.*',
                'users.name as uploaded_by_name'
            )
            ->leftJoin('users', 'task_attachments.uploaded_by', '=', 'users.id')
            ->where('task_attachments.task_id', $taskId)
            ->orderBy('task_attachments.created_at', 'desc')
            ->get();

        return response()->json($attachments);
    }

    /**
     * Upload task attachment
     */
    public function uploadTaskAttachment(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif,webp,zip',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $this->ensureTaskAttachmentsTable();

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        
        // Generate unique filename
        $filename = time() . '_' . Str::slug(pathinfo($originalName, PATHINFO_FILENAME)) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('task_attachments', $filename, 'public');

        $attachmentId = DB::table('task_attachments')->insertGetId([
            'task_id' => $taskId,
            'file_name' => $originalName,
            'file_path' => $path,
            'file_size' => $size,
            'mime_type' => $mimeType,
            'uploaded_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $attachment = DB::table('task_attachments')
            ->select(
                'task_attachments.*',
                'users.name as uploaded_by_name'
            )
            ->leftJoin('users', 'task_attachments.uploaded_by', '=', 'users.id')
            ->where('task_attachments.id', $attachmentId)
            ->first();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'file_uploaded',
            $user->id,
            null,
            ['attachment_id' => $attachmentId, 'file_name' => $originalName],
            null,
            "File uploaded: {$originalName}"
        );

        return response()->json($attachment, 201);
    }

    /**
     * Delete task attachment
     */
    public function deleteTaskAttachment(Request $request, $projectId, $taskId, $attachmentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $this->ensureTaskAttachmentsTable();

        $attachment = DB::table('task_attachments')
            ->where('id', $attachmentId)
            ->where('task_id', $taskId)
            ->first();

        if (!$attachment) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }

        // Uploader can delete own attachment with update permission; others need delete permission
        $isUploader = (int) $attachment->uploaded_by === (int) $user->id;
        if ($isUploader && !$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }
        if (!$isUploader && !$this->checkPermission($user, 'delete')) {
            return response()->json(['message' => 'Nemate dozvolu za brisanje ovog priloga'], 403);
        }

        // Delete file from storage
        try {
            Storage::disk('public')->delete($attachment->file_path);
        } catch (\Exception $e) {
            Log::warning('Projects: Failed to delete attachment file', [
                'error' => $e->getMessage(),
                'file_path' => $attachment->file_path,
            ]);
        }

        DB::table('task_attachments')->where('id', $attachmentId)->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'file_deleted',
            $user->id,
            ['attachment_id' => $attachmentId, 'file_name' => $attachment->file_name],
            null,
            null,
            "File deleted: {$attachment->file_name}"
        );

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    /**
     * Download task attachment
     */
    public function downloadTaskAttachment(Request $request, $projectId, $taskId, $attachmentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $this->ensureTaskAttachmentsTable();

        $attachment = DB::table('task_attachments')
            ->where('id', $attachmentId)
            ->where('task_id', $taskId)
            ->first();

        if (!$attachment) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }

        $path = Storage::disk('public')->path($attachment->file_path);
        if (!file_exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return response()->download($path, $attachment->file_name);
    }

    // ==================== TIME TRACKING ====================

    /**
     * Start time tracking for a task
     */
    public function startTimeTracking(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        // Verify task exists and belongs to project
        $task = DB::table('tasks')->find($taskId);
        if (!$task || $task->project_id != $projectId) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        // Check if user already has an active timer for this task
        $activeTimer = DB::table('time_tracking')
            ->where('task_id', $taskId)
            ->where('user_id', $user->id)
            ->where('is_running', true)
            ->first();

        if ($activeTimer) {
            return response()->json(['message' => 'Već postoji aktivan timer za ovaj task'], 422);
        }

        // Stop any other active timers for this user
        DB::table('time_tracking')
            ->where('user_id', $user->id)
            ->where('is_running', true)
            ->update([
                'ended_at' => now(),
                'duration' => DB::raw('TIMESTAMPDIFF(SECOND, started_at, NOW())'),
                'is_running' => false,
                'updated_at' => now(),
            ]);

        // Create new time tracking entry
        $timeTrackingId = DB::table('time_tracking')->insertGetId([
            'task_id' => $taskId,
            'user_id' => $user->id,
            'project_id' => $projectId,
            'started_at' => now(),
            'ended_at' => null,
            'duration' => null,
            'description' => $request->input('notes'),
            'is_running' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $timeTracking = DB::table('time_tracking')->find($timeTrackingId);

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'time_tracking_started',
            $user->id,
            null,
            ['time_tracking_id' => $timeTrackingId, 'start_time' => $timeTracking->started_at],
            null,
            "Time tracking started for task"
        );

        return response()->json($timeTracking, 201);
    }

    /**
     * Stop time tracking for a task
     */
    public function stopTimeTracking(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        // Find active timer
        $timeTracking = DB::table('time_tracking')
            ->where('task_id', $taskId)
            ->where('user_id', $user->id)
            ->where('is_running', true)
            ->first();

        if (!$timeTracking) {
            return response()->json(['message' => 'Nema aktivnog timera'], 404);
        }

        // Calculate duration in seconds
        $startTime = \Carbon\Carbon::parse($timeTracking->started_at);
        $endTime = now();
        $durationSeconds = $startTime->diffInSeconds($endTime);
        $durationMinutes = round($durationSeconds / 60, 2);

        // Update time tracking
        DB::table('time_tracking')
            ->where('id', $timeTracking->id)
            ->update([
                'ended_at' => $endTime,
                'duration' => $durationSeconds,
                'description' => $request->input('notes', $timeTracking->description),
                'is_running' => false,
                'updated_at' => now(),
            ]);

        $updatedTimeTracking = DB::table('time_tracking')->find($timeTracking->id);

        // Update task actual_hours if column exists
        if (Schema::hasColumn('tasks', 'actual_hours')) {
            $task = DB::table('tasks')->find($taskId);
            $currentHours = $task->actual_hours ?? 0;
            $newHours = $currentHours + ($durationSeconds / 3600);
            
            DB::table('tasks')
                ->where('id', $taskId)
                ->update(['actual_hours' => $newHours]);
        }

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'time_tracking_stopped',
            $user->id,
            ['duration_seconds' => $durationSeconds],
            ['time_tracking_id' => $timeTracking->id, 'ended_at' => $endTime],
            null,
            "Time tracking stopped: {$durationMinutes} minutes"
        );

        return response()->json($updatedTimeTracking);
    }

    /**
     * Get time tracking entries for a task
     */
    public function getTaskTimeTracking(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $query = DB::table('time_tracking')
            ->select(
                'time_tracking.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->join('users', 'time_tracking.user_id', '=', 'users.id')
            ->where('time_tracking.task_id', $taskId)
            ->orderBy('time_tracking.started_at', 'desc');

        // Filter by user if requested
        if ($request->has('user_id')) {
            $query->where('time_tracking.user_id', $request->input('user_id'));
        }

        $entries = $query->get();

        // Calculate total time (convert seconds to minutes)
        $totalSeconds = $entries->sum('duration') ?? 0;
        $totalMinutes = round($totalSeconds / 60, 2);
        $totalHours = round($totalSeconds / 3600, 2);

        return response()->json([
            'entries' => $entries,
            'total_minutes' => $totalMinutes,
            'total_hours' => $totalHours,
        ]);
    }

    /**
     * Get user's active timer
     */
    public function getActiveTimer(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $timer = DB::table('time_tracking')
            ->select(
                'time_tracking.*',
                'tasks.title as task_title',
                'tasks.project_id',
                'projects.name as project_name'
            )
            ->join('tasks', 'time_tracking.task_id', '=', 'tasks.id')
            ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
            ->where('time_tracking.user_id', $user->id)
            ->where('time_tracking.is_running', true)
            ->first();

        if ($timer) {
            // Calculate current duration
            $startTime = \Carbon\Carbon::parse($timer->started_at);
            $currentDurationSeconds = $startTime->diffInSeconds(now());
            $currentDurationMinutes = round($currentDurationSeconds / 60, 2);
            $timer->current_duration_seconds = $currentDurationSeconds;
            $timer->current_duration_minutes = $currentDurationMinutes;
            $timer->current_duration_hours = round($currentDurationSeconds / 3600, 2);
        }

        return response()->json($timer);
    }

    /**
     * Manual time entry (add time without timer)
     */
    public function addManualTimeEntry(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'duration_minutes' => 'required|numeric|min:0.1',
            'started_at' => 'nullable|date',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify task exists
        $task = DB::table('tasks')->find($taskId);
        if (!$task || $task->project_id != $projectId) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $startTime = $request->input('started_at') ? \Carbon\Carbon::parse($request->input('started_at')) : now();
        $durationMinutes = $request->input('duration_minutes');
        $durationSeconds = round($durationMinutes * 60);
        $endTime = $startTime->copy()->addSeconds($durationSeconds);

        $timeTrackingId = DB::table('time_tracking')->insertGetId([
            'task_id' => $taskId,
            'user_id' => $user->id,
            'project_id' => $projectId,
            'started_at' => $startTime,
            'ended_at' => $endTime,
            'duration' => $durationSeconds,
            'description' => $request->input('description'),
            'is_running' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $timeTracking = DB::table('time_tracking')->find($timeTrackingId);

        // Update task actual_hours if column exists
        if (Schema::hasColumn('tasks', 'actual_hours')) {
            $currentHours = $task->actual_hours ?? 0;
            $newHours = $currentHours + ($durationMinutes / 60);
            
            DB::table('tasks')
                ->where('id', $taskId)
                ->update(['actual_hours' => $newHours]);
        }

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'time_entry_added',
            $user->id,
            null,
            ['time_tracking_id' => $timeTrackingId, 'duration_minutes' => $durationMinutes],
            null,
            "Manual time entry added: {$durationMinutes} minutes"
        );

        return response()->json($timeTracking, 201);
    }

    /**
     * Delete time tracking entry
     */
    public function deleteTimeEntry(Request $request, $projectId, $taskId, $timeEntryId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $timeEntry = DB::table('time_tracking')->find($timeEntryId);
        if (!$timeEntry || $timeEntry->task_id != $taskId) {
            return response()->json(['message' => 'Time entry not found'], 404);
        }

        // Only allow user to delete their own entries (or admin/manager)
        $hasAdminRole = $user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'manager', 'super-admin']);
        if (!$hasAdminRole && $timeEntry->user_id != $user->id) {
            return response()->json(['message' => 'Možete brisati samo svoje vremenske unose'], 403);
        }

        $durationSeconds = $timeEntry->duration ?? 0;
        $durationMinutes = round($durationSeconds / 60, 2);

        // Update task actual_hours if column exists
        if (Schema::hasColumn('tasks', 'actual_hours') && $durationSeconds > 0) {
            $task = DB::table('tasks')->find($taskId);
            $currentHours = $task->actual_hours ?? 0;
            $newHours = max(0, $currentHours - ($durationSeconds / 3600));
            
            DB::table('tasks')
                ->where('id', $taskId)
                ->update(['actual_hours' => $newHours]);
        }

        DB::table('time_tracking')->where('id', $timeEntryId)->delete();

        // Log activity
        $this->logActivity(
            $projectId,
            $taskId,
            'task',
            'time_entry_deleted',
            $user->id,
            ['time_tracking_id' => $timeEntryId, 'duration_minutes' => $durationMinutes],
            null,
            null,
            "Time entry deleted: {$durationMinutes} minutes"
        );

        return response()->json(['message' => 'Time entry deleted successfully']);
    }

    // ==================== GANTT CHART ====================

    /**
     * Get Gantt chart data for a project
     * Returns tasks with dependencies, dates, and hierarchy
     */
    public function getGanttChart(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $isAllProjects = ($projectId === 'all' || $projectId === 'All');
        $project = null;

        // Get project info (only if not "all projects")
        if (!$isAllProjects) {
            $project = DB::table('projects')->find($projectId);
            if (!$project) {
                return response()->json(['message' => 'Projekat nije pronađen'], 404);
            }
        }

        // Get all tasks for the project(s)
        $tasksSelectFields = ['tasks.*'];
        $tasksQuery = DB::table('tasks');
        
        // Only join users table if assigned_to column exists
        if (Schema::hasColumn('tasks', 'assigned_to')) {
            $tasksSelectFields[] = 'users.name as assigned_to_name';
            $tasksQuery->leftJoin('users', 'tasks.assigned_to', '=', 'users.id');
        }
        
        // Only join creator table if created_by column exists
        if (Schema::hasColumn('tasks', 'created_by')) {
            $tasksSelectFields[] = 'creator.name as created_by_name';
            $tasksQuery->leftJoin('users as creator', 'tasks.created_by', '=', 'creator.id');
        }
        
        // For "all projects", add project name to tasks
        if ($isAllProjects) {
            $tasksQuery->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
                      ->addSelect('projects.name as project_name', 'projects.id as project_id');
        }
        
        $tasks = $tasksQuery->select($tasksSelectFields);
        
        // Filter by project (only if not "all projects")
        if (!$isAllProjects) {
            $tasks->where('tasks.project_id', $projectId);
        }
        
        // Only filter by parent_task_id if column exists
        if (Schema::hasColumn('tasks', 'parent_task_id')) {
            $tasks->whereNull('tasks.parent_task_id'); // Only top-level tasks for main view
        }
        
        $tasks = $tasks->orderBy('tasks.created_at', 'asc')->get();

        // Get all subtasks
        $subtasksSelectFields = ['tasks.*'];
        $subtasksQuery = DB::table('tasks');
        
        // Only join users table if assigned_to column exists
        if (Schema::hasColumn('tasks', 'assigned_to')) {
            $subtasksSelectFields[] = 'users.name as assigned_to_name';
            $subtasksQuery->leftJoin('users', 'tasks.assigned_to', '=', 'users.id');
        }
        
        // For "all projects", add project name to subtasks
        if ($isAllProjects) {
            $subtasksQuery->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
                      ->addSelect('projects.name as project_name');
        }
        
        // Filter by project (only if not "all projects")
        if (!$isAllProjects) {
            $subtasksQuery->where('tasks.project_id', $projectId);
        }
        
        // Only filter by parent_task_id if column exists
        if (Schema::hasColumn('tasks', 'parent_task_id')) {
            $subtasksQuery->whereNotNull('tasks.parent_task_id');
        }
        
        $subtasks = $subtasksQuery
            ->select($subtasksSelectFields)
            ->get();
        
        // Group by parent_task_id only if column exists
        if (Schema::hasColumn('tasks', 'parent_task_id')) {
            $subtasks = $subtasks->groupBy('parent_task_id');
        } else {
            // If parent_task_id doesn't exist, create empty collection grouped by task_id
            $subtasks = collect();
        }

        // Get dependencies
        $dependencies = [];
        if (Schema::hasTable('task_dependencies')) {
            $deps = DB::table('task_dependencies')
                ->whereIn('task_id', $tasks->pluck('id'))
                ->orWhereIn('task_id', $subtasks->flatten()->pluck('id'))
                ->get();

            foreach ($deps as $dep) {
                if (!isset($dependencies[$dep->task_id])) {
                    $dependencies[$dep->task_id] = [];
                }
                $dependencies[$dep->task_id][] = [
                    'id' => $dep->id,
                    'depends_on_task_id' => $dep->depends_on_task_id,
                    'type' => $dep->type, // 'finish-to-start', 'start-to-start', etc.
                ];
            }
        }

        // Get assignees for each task
        if (Schema::hasTable('task_assignees')) {
            foreach ($tasks as $task) {
                $task->assignees = DB::table('task_assignees')
                    ->select('task_assignees.*', 'users.name as user_name', 'users.email as user_email')
                    ->join('users', 'task_assignees.user_id', '=', 'users.id')
                    ->where('task_assignees.task_id', $task->id)
                    ->get();
            }
        }

        // Add subtasks to parent tasks
        foreach ($tasks as $task) {
            $task->subtasks = $subtasks->get($task->id, collect())->values();
        }

        // Calculate timeline dates
        if (!$isAllProjects && $project) {
            $projectStartDate = $project->start_date ?? now();
            $projectEndDate = $project->end_date ?? null;
        } else {
            // For "all projects", calculate from task dates
            $projectStartDate = now();
            $projectEndDate = null;
        }

        // Calculate task dates if not set
        foreach ($tasks as $task) {
            // Use start_date if exists, otherwise use created_at or due_date
            if (!Schema::hasColumn('tasks', 'start_date') || !$task->start_date) {
                $task->start_date = $task->created_at ? date('Y-m-d', strtotime($task->created_at)) : date('Y-m-d');
            } else {
                $task->start_date = is_string($task->start_date) ? $task->start_date : date('Y-m-d', strtotime($task->start_date));
            }

            // Use end_date if exists, otherwise use due_date or calculate from estimated_hours
            if (!Schema::hasColumn('tasks', 'end_date') || !$task->end_date) {
                if ($task->due_date) {
                    $task->end_date = is_string($task->due_date) ? $task->due_date : date('Y-m-d', strtotime($task->due_date));
                } elseif ($task->estimated_hours && $task->start_date) {
                    // Estimate end date based on hours (assuming 8 hours per day)
                    $days = ceil($task->estimated_hours / 8);
                    $start = new \DateTime($task->start_date);
                    $start->modify("+{$days} days");
                    $task->end_date = $start->format('Y-m-d');
                } else {
                    $task->end_date = $task->start_date;
                }
            } else {
                $task->end_date = is_string($task->end_date) ? $task->end_date : date('Y-m-d', strtotime($task->end_date));
            }

            // Add dependencies
            $task->dependencies = $dependencies[$task->id] ?? [];

            // Calculate progress percentage
            $task->progress = $this->calculateTaskProgress($task->id);
        }

        // Get milestones
        $milestones = [];
        if (Schema::hasTable('project_milestones')) {
            if ($isAllProjects) {
                // Get milestones for all projects that have tasks
                $projectIds = $tasks->pluck('project_id')->unique()->filter();
                if ($projectIds->isNotEmpty()) {
                    $milestones = DB::table('project_milestones')
                        ->whereIn('project_id', $projectIds)
                        ->orderBy('target_date', 'asc')
                        ->get();
                }
            } else {
                $milestones = DB::table('project_milestones')
                    ->where('project_id', $projectId)
                    ->orderBy('target_date', 'asc')
                    ->get();
            }
        }

        // Get all projects if viewing all projects
        $projectsList = [];
        if ($isAllProjects) {
            // Get all projects, not just those with tasks
            $projectsList = DB::table('projects')
                ->select('id', 'name', 'status', 'start_date', 'end_date', 'priority', 'progress')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($proj) {
                    return (array) $proj;
                })
                ->toArray();
        }

        return response()->json([
            'tasks' => $tasks,
            'projects' => $projectsList,
            'project' => $isAllProjects ? [
                'id' => null,
                'name' => 'Svi projekti',
                'start_date' => $projectStartDate,
                'end_date' => $projectEndDate,
            ] : [
                'id' => $project->id,
                'name' => $project->name,
                'start_date' => $projectStartDate,
                'end_date' => $projectEndDate,
            ],
            'dependencies' => $dependencies,
            'milestones' => $milestones,
        ]);
    }

    /**
     * Update task dates (for Gantt chart drag & resize)
     */
    public function updateTaskDates(Request $request, $projectId, $taskId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'update')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        $validator = Validator::make($request->all(), [
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'due_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task = DB::table('tasks')->find($taskId);
        if (!$task || $task->project_id != $projectId) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $updateData = [];
        $oldTask = (array) $task;

        // Update start_date if column exists
        if ($request->has('start_date') && Schema::hasColumn('tasks', 'start_date')) {
            $updateData['start_date'] = $request->input('start_date');
        }

        // Update end_date if column exists
        if ($request->has('end_date') && Schema::hasColumn('tasks', 'end_date')) {
            $updateData['end_date'] = $request->input('end_date');
        }

        // Update due_date (always exists)
        if ($request->has('due_date')) {
            $updateData['due_date'] = $request->input('due_date');
        }

        if (!empty($updateData)) {
            $updateData['updated_at'] = now();
            DB::table('tasks')->where('id', $taskId)->update($updateData);

            $updatedTask = DB::table('tasks')->find($taskId);

            // Log activity
            $this->logActivity(
                $projectId,
                $taskId,
                'task',
                'dates_updated',
                $user->id,
                $oldTask,
                (array) $updatedTask,
                ['updated_fields' => array_keys($updateData)],
                "Task dates updated"
            );

            // Auto-adjust dependent tasks if requested
            if ($request->input('auto_adjust_dependencies', false)) {
                $this->autoAdjustDependentTasks($projectId, $taskId, $updateData);
            }

            return response()->json([
                'task' => $updatedTask,
                'message' => 'Task dates updated successfully'
            ]);
        }

        return response()->json(['message' => 'No changes to update'], 400);
    }

    /**
     * Auto-adjust dependent tasks based on dependencies
     */
    private function autoAdjustDependentTasks($projectId, $taskId, $updatedTaskData)
    {
        if (!Schema::hasTable('task_dependencies')) {
            return;
        }

        // Find tasks that depend on this task
        $dependentTasks = DB::table('task_dependencies')
            ->join('tasks', 'task_dependencies.task_id', '=', 'tasks.id')
            ->where('task_dependencies.depends_on_task_id', $taskId)
            ->where('tasks.project_id', $projectId)
            ->select('tasks.*', 'task_dependencies.type as dependency_type')
            ->get();

        foreach ($dependentTasks as $dependentTask) {
            $newStartDate = null;
            $newEndDate = null;

            // Get the updated task's dates
            $updatedTask = DB::table('tasks')->find($taskId);
            $taskStartDate = $updatedTask->start_date ?? $updatedTask->created_at;
            $taskEndDate = $updatedTask->end_date ?? $updatedTask->due_date ?? $taskStartDate;

            if (!$taskStartDate || !$taskEndDate) {
                continue;
            }

            $taskStart = new \DateTime($taskStartDate);
            $taskEnd = new \DateTime($taskEndDate);
            $taskDuration = $taskStart->diff($taskEnd)->days;

            // Calculate new dates based on dependency type
            switch ($dependentTask->dependency_type) {
                case 'finish-to-start':
                    // Dependent task starts after this task ends
                    $newStartDate = $taskEnd->modify('+1 day')->format('Y-m-d');
                    if (Schema::hasColumn('tasks', 'end_date') && $dependentTask->end_date) {
                        $dependentStart = new \DateTime($newStartDate);
                        $dependentEnd = new \DateTime($dependentTask->end_date);
                        $dependentDuration = $dependentStart->diff($dependentEnd)->days;
                        if ($dependentDuration < 0) {
                            $newEndDate = $dependentStart->modify("+{$taskDuration} days")->format('Y-m-d');
                        }
                    }
                    break;

                case 'start-to-start':
                    // Dependent task starts when this task starts
                    $newStartDate = $taskStart->format('Y-m-d');
                    break;

                case 'finish-to-finish':
                    // Dependent task ends when this task ends
                    $newEndDate = $taskEnd->format('Y-m-d');
                    break;

                case 'start-to-finish':
                    // Dependent task ends when this task starts
                    $newEndDate = $taskStart->format('Y-m-d');
                    break;
            }

            // Update dependent task
            $updateData = [];
            if ($newStartDate && Schema::hasColumn('tasks', 'start_date')) {
                $updateData['start_date'] = $newStartDate;
            }
            if ($newEndDate && Schema::hasColumn('tasks', 'end_date')) {
                $updateData['end_date'] = $newEndDate;
            }

            if (!empty($updateData)) {
                $updateData['updated_at'] = now();
                DB::table('tasks')->where('id', $dependentTask->id)->update($updateData);
            }
        }
    }

    /**
     * Calculate task progress percentage
     */
    private function calculateTaskProgress($taskId)
    {
        $task = DB::table('tasks')->find($taskId);
        if (!$task) {
            return 0;
        }

        // If task is done, progress is 100%
        if ($task->status === 'done' || $task->status === 'completed') {
            return 100;
        }

        // Count completed subtasks
        $subtasks = DB::table('tasks')
            ->where('parent_task_id', $taskId)
            ->get();

        if ($subtasks->isEmpty()) {
            // No subtasks - use status-based progress
            switch ($task->status) {
                case 'todo':
                    return 0;
                case 'in-progress':
                    return 50;
                case 'review':
                    return 75;
                default:
                    return 0;
            }
        }

        $completedSubtasks = $subtasks->where('status', 'done')->count();
        return round(($completedSubtasks / $subtasks->count()) * 100);
    }

    /**
     * Get milestones for a project
     */
    public function getMilestones(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        // Check if milestones table exists
        if (!Schema::hasTable('project_milestones')) {
            return response()->json([]);
        }

        $milestones = DB::table('project_milestones')
            ->where('project_id', $projectId)
            ->orderBy('target_date', 'asc')
            ->get();

        return response()->json($milestones);
    }

    /**
     * Get timeline data (all projects and tasks with activities) for timeline view
     */
    public function getTimeline(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        try {
            $projectId = $request->input('project_id');
            $userId = $request->input('user_id');
            $status = $request->input('status');
            $taskStatus = $request->input('task_status');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');

            $timeline = [];

            // Get projects with their activities
            $projectsQuery = DB::table('projects')
                ->select('projects.*', 'users.name as owner_name')
                ->leftJoin('users', 'projects.owner_id', '=', 'users.id');

            // Filter by project
            if ($projectId) {
                $projectsQuery->where('projects.id', $projectId);
            }

            // Filter by owner/user
            if ($userId) {
                $projectsQuery->where('projects.owner_id', $userId);
            }

            // Filter by status
            if ($status) {
                $projectsQuery->where('projects.status', $status);
            }

            // Filter by date range (created_at or start_date)
            if ($dateFrom) {
                if (Schema::hasColumn('projects', 'start_date')) {
                    $projectsQuery->where(function ($q) use ($dateFrom) {
                        $q->where('projects.start_date', '>=', $dateFrom)
                          ->orWhere('projects.created_at', '>=', $dateFrom);
                    });
                } else {
                    $projectsQuery->where('projects.created_at', '>=', $dateFrom);
                }
            }
            if ($dateTo) {
                if (Schema::hasColumn('projects', 'end_date')) {
                    $projectsQuery->where(function ($q) use ($dateTo) {
                        $q->where('projects.end_date', '<=', $dateTo)
                          ->orWhere('projects.created_at', '<=', $dateTo);
                    });
                } else {
                    $projectsQuery->where('projects.created_at', '<=', $dateTo);
                }
            }

            // Only include non-deleted projects
            if (Schema::hasColumn('projects', 'deleted_at')) {
                $projectsQuery->whereNull('projects.deleted_at');
            }

            $projects = $projectsQuery->orderBy('projects.created_at', 'desc')->get();

            // Convert projects to timeline items
            foreach ($projects as $project) {
                $date = null;
                if (Schema::hasColumn('projects', 'start_date') && $project->start_date) {
                    $date = $project->start_date;
                } else {
                    $date = $project->created_at;
                }

                $timeline[] = [
                    'type' => 'project',
                    'id' => $project->id,
                    'title' => $project->name,
                    'description' => $project->description ?? null,
                    'date' => $date,
                    'user' => $project->owner_name ?? null,
                    'status' => $project->status ?? 'active',
                    'priority' => $project->priority ?? 'medium',
                    'color' => $this->getProjectColor($project->status ?? 'active'),
                    'entity_type' => 'project',
                    'entity_id' => $project->id,
                ];
            }

            // Get tasks with their activities
            $tasksQuery = DB::table('tasks')
                ->select('tasks.*', 'projects.name as project_name', 'projects.id as project_id')
                ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id');

            // Join assigned user
            $assignedToColumn = Schema::hasColumn('tasks', 'assigned_to') ? 'assigned_to' : 
                               (Schema::hasColumn('tasks', 'assigned_to_id') ? 'assigned_to_id' : null);
            
            if ($assignedToColumn) {
                $tasksQuery->leftJoin('users as assignee', "tasks.{$assignedToColumn}", '=', 'assignee.id')
                    ->addSelect('assignee.name as assigned_to_name', 'assignee.id as assigned_to_id');
            }

            // Join creator
            if (Schema::hasColumn('tasks', 'created_by')) {
                $tasksQuery->leftJoin('users as creator', 'tasks.created_by', '=', 'creator.id')
                    ->addSelect('creator.name as created_by_name');
            }

            // Filter by project
            if ($projectId) {
                $tasksQuery->where('tasks.project_id', $projectId);
            } else {
                // Only show tasks from projects (not personal tasks)
                $tasksQuery->whereNotNull('tasks.project_id');
            }

            // Filter by assigned user - check both assigned_to column and task_assignees table
            if ($userId) {
                $tasksQuery->where(function($q) use ($userId, $assignedToColumn) {
                    // Check assigned_to/assigned_to_id column
                    if ($assignedToColumn) {
                        $q->where("tasks.{$assignedToColumn}", $userId);
                    }
                    
                    // Also check task_assignees table for multiple assignees
                    if (Schema::hasTable('task_assignees')) {
                        $assignedTaskIds = DB::table('task_assignees')
                            ->where('user_id', $userId)
                            ->distinct()
                            ->pluck('task_id')
                            ->toArray();
                        
                        if (!empty($assignedTaskIds)) {
                            if ($assignedToColumn) {
                                $q->orWhereIn('tasks.id', $assignedTaskIds);
                            } else {
                                $q->whereIn('tasks.id', $assignedTaskIds);
                            }
                        }
                    }
                });
            }

            // Filter by task status
            if ($taskStatus) {
                $tasksQuery->where('tasks.status', $taskStatus);
            }

            // Filter by priority
            $priority = $request->input('priority');
            if ($priority) {
                $tasksQuery->where('tasks.priority', $priority);
            }

            // Filter by date range (due_date, start_date, or created_at)
            if ($dateFrom) {
                $tasksQuery->where(function ($q) use ($dateFrom) {
                    if (Schema::hasColumn('tasks', 'due_date')) {
                        $q->where('tasks.due_date', '>=', $dateFrom);
                    }
                    if (Schema::hasColumn('tasks', 'start_date')) {
                        $q->orWhere('tasks.start_date', '>=', $dateFrom);
                    }
                    $q->orWhere('tasks.created_at', '>=', $dateFrom);
                });
            }
            if ($dateTo) {
                $tasksQuery->where(function ($q) use ($dateTo) {
                    if (Schema::hasColumn('tasks', 'due_date')) {
                        $q->where('tasks.due_date', '<=', $dateTo);
                    }
                    if (Schema::hasColumn('tasks', 'start_date')) {
                        $q->orWhere('tasks.start_date', '<=', $dateTo);
                    }
                    $q->orWhere('tasks.created_at', '<=', $dateTo);
                });
            }

            // Only include non-deleted tasks
            if (Schema::hasColumn('tasks', 'deleted_at')) {
                $tasksQuery->whereNull('tasks.deleted_at');
            }

            // Only top-level tasks (no parent)
            if (Schema::hasColumn('tasks', 'parent_task_id')) {
                $tasksQuery->whereNull('tasks.parent_task_id');
            }

            $tasks = $tasksQuery->orderBy('tasks.created_at', 'desc')->get();

            // Convert tasks to timeline items
            foreach ($tasks as $task) {
                $date = null;
                // Use due_date if available, otherwise start_date, otherwise created_at
                if (Schema::hasColumn('tasks', 'due_date') && $task->due_date) {
                    $date = $task->due_date;
                } elseif (Schema::hasColumn('tasks', 'start_date') && $task->start_date) {
                    $date = $task->start_date;
                } else {
                    $date = $task->created_at;
                }

                $userName = $task->assigned_to_name ?? $task->created_by_name ?? null;

                $timeline[] = [
                    'type' => 'task',
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description ?? null,
                    'date' => $date,
                    'user' => $userName,
                    'status' => $task->status ?? 'todo',
                    'priority' => $task->priority ?? 'medium',
                    'color' => $this->getTaskColor($task->priority ?? 'medium', $task->status ?? 'todo'),
                    'project_name' => $task->project_name ?? null,
                    'project_id' => $task->project_id ?? null,
                    'entity_type' => 'task',
                    'entity_id' => $task->id,
                ];
            }

            // Get project activities if table exists
            if (Schema::hasTable('project_activities')) {
                $activitiesQuery = DB::table('project_activities')
                    ->select('project_activities.*', 'users.name as user_name')
                    ->leftJoin('users', 'project_activities.user_id', '=', 'users.id');

                // Filter by project
                if ($projectId) {
                    $activitiesQuery->where('project_activities.project_id', $projectId);
                }

                // Filter by user
                if ($userId) {
                    $activitiesQuery->where('project_activities.user_id', $userId);
                }

                // Filter by date range
                if ($dateFrom) {
                    $activitiesQuery->where('project_activities.created_at', '>=', $dateFrom);
                }
                if ($dateTo) {
                    $activitiesQuery->where('project_activities.created_at', '<=', $dateTo);
                }

                $activities = $activitiesQuery->orderBy('project_activities.created_at', 'desc')->get();

                foreach ($activities as $activity) {
                    $title = $activity->description ?? $activity->action ?? 'Activity';
                    if ($activity->entity_type === 'task' && $activity->task_id) {
                        $task = DB::table('tasks')->find($activity->task_id);
                        if ($task) {
                            $title = "{$activity->action}: {$task->title}";
                        }
                    } elseif ($activity->entity_type === 'project' && $activity->project_id) {
                        $proj = DB::table('projects')->find($activity->project_id);
                        if ($proj) {
                            $title = "{$activity->action}: {$proj->name}";
                        }
                    }

                    $timeline[] = [
                        'type' => 'activity',
                        'id' => $activity->id,
                        'title' => $title,
                        'description' => $activity->description ?? null,
                        'date' => $activity->created_at,
                        'user' => $activity->user_name ?? null,
                        'action' => $activity->action ?? null,
                        'color' => '#8b5cf6', // purple for activities
                        'entity_type' => $activity->entity_type ?? null,
                        'entity_id' => $activity->task_id ?? $activity->project_id ?? null,
                    ];
                }
            }

            // Sort timeline by date (newest first)
            usort($timeline, function ($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });

            return response()->json($timeline);
        } catch (\Exception $e) {
            Log::error('Error in getTimeline', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load timeline',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get calendar data (projects and tasks) for calendar view
     */
    public function getCalendarData(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$this->checkPermission($user, 'read')) {
            return response()->json(['message' => 'Nemate dozvolu'], 403);
        }

        try {
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $projectId = $request->input('project_id');
            $userId = $request->input('user_id');
            $taskId = $request->input('task_id');

            $events = [];

            // Get projects with start_date and end_date
            $projectsQuery = DB::table('projects')
                ->select('projects.*', 'users.name as owner_name')
                ->leftJoin('users', 'projects.owner_id', '=', 'users.id')
                ->where(function ($q) use ($startDate, $endDate) {
                    if ($startDate && $endDate) {
                        // Project overlaps with date range
                        $q->where(function ($query) use ($startDate, $endDate) {
                            $query->where(function ($q1) use ($startDate, $endDate) {
                                // Projects that start within range
                                if (Schema::hasColumn('projects', 'start_date')) {
                                    $q1->whereBetween('projects.start_date', [$startDate, $endDate]);
                                }
                            })->orWhere(function ($q2) use ($startDate, $endDate) {
                                // Projects that end within range
                                if (Schema::hasColumn('projects', 'end_date')) {
                                    $q2->whereBetween('projects.end_date', [$startDate, $endDate]);
                                }
                            })->orWhere(function ($q3) use ($startDate, $endDate) {
                                // Projects that span the entire range
                                if (Schema::hasColumn('projects', 'start_date') && Schema::hasColumn('projects', 'end_date')) {
                                    $q3->where('projects.start_date', '<=', $startDate)
                                       ->where('projects.end_date', '>=', $endDate);
                                }
                            });
                        });
                    }
                });

            // Filter by project
            if ($projectId) {
                $projectsQuery->where('projects.id', $projectId);
            }

            // Filter by owner/user
            if ($userId) {
                $projectsQuery->where('projects.owner_id', $userId);
            }

            // Only include non-deleted projects
            if (Schema::hasColumn('projects', 'deleted_at')) {
                $projectsQuery->whereNull('projects.deleted_at');
            }

            $projects = $projectsQuery->get();

            // Convert projects to calendar events
            foreach ($projects as $project) {
                $eventDate = null;
                $endEventDate = null;

                if (Schema::hasColumn('projects', 'start_date') && $project->start_date) {
                    $eventDate = $project->start_date;
                } elseif (Schema::hasColumn('projects', 'created_at')) {
                    $eventDate = date('Y-m-d', strtotime($project->created_at));
                }

                if (Schema::hasColumn('projects', 'end_date') && $project->end_date) {
                    $endEventDate = $project->end_date;
                }

                if ($eventDate) {
                    $events[] = [
                        'id' => 'project_' . $project->id,
                        'title' => $project->name,
                        'type' => 'project',
                        'start' => $eventDate,
                        'end' => $endEventDate ?: $eventDate,
                        'color' => $this->getProjectColor($project->status ?? 'active'),
                        'project_id' => $project->id,
                        'status' => $project->status ?? 'active',
                        'priority' => $project->priority ?? 'medium',
                        'owner_name' => $project->owner_name ?? null,
                        'description' => $project->description ?? null,
                    ];
                }
            }

            // Get tasks with due_date or start_date
            $tasksQuery = DB::table('tasks')
                ->select('tasks.*', 'projects.name as project_name', 'projects.id as project_id')
                ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id');

            // Join assigned user
            $assignedToColumn = Schema::hasColumn('tasks', 'assigned_to') ? 'assigned_to' : 
                               (Schema::hasColumn('tasks', 'assigned_to_id') ? 'assigned_to_id' : null);
            
            if ($assignedToColumn) {
                $tasksQuery->leftJoin('users as assignee', "tasks.{$assignedToColumn}", '=', 'assignee.id')
                    ->addSelect('assignee.name as assigned_to_name', 'assignee.id as assigned_to_id');
            }

            // Filter by date range
            if ($startDate && $endDate) {
                $tasksQuery->where(function ($q) use ($startDate, $endDate) {
                    // Tasks with due_date in range
                    if (Schema::hasColumn('tasks', 'due_date')) {
                        $q->whereBetween('tasks.due_date', [$startDate, $endDate]);
                    }
                    // Or tasks with start_date in range
                    if (Schema::hasColumn('tasks', 'start_date')) {
                        $q->orWhereBetween('tasks.start_date', [$startDate, $endDate]);
                    }
                });
            }

            // Filter by project
            if ($projectId) {
                $tasksQuery->where('tasks.project_id', $projectId);
            } else {
                // Only show tasks from projects (not personal tasks)
                $tasksQuery->whereNotNull('tasks.project_id');
            }

            // Filter by task
            if ($taskId) {
                $tasksQuery->where('tasks.id', $taskId);
            }

            // Filter by assigned user - check both assigned_to column and task_assignees table
            if ($userId) {
                $tasksQuery->where(function($q) use ($userId, $assignedToColumn) {
                    // Check assigned_to/assigned_to_id column
                    if ($assignedToColumn) {
                        $q->where("tasks.{$assignedToColumn}", $userId);
                    }
                    
                    // Also check task_assignees table for multiple assignees
                    if (Schema::hasTable('task_assignees')) {
                        $assignedTaskIds = DB::table('task_assignees')
                            ->where('user_id', $userId)
                            ->distinct()
                            ->pluck('task_id')
                            ->toArray();
                        
                        if (!empty($assignedTaskIds)) {
                            if ($assignedToColumn) {
                                $q->orWhereIn('tasks.id', $assignedTaskIds);
                            } else {
                                $q->whereIn('tasks.id', $assignedTaskIds);
                            }
                        }
                    }
                });
            }

            // Only include non-deleted tasks
            if (Schema::hasColumn('tasks', 'deleted_at')) {
                $tasksQuery->whereNull('tasks.deleted_at');
            }

            // Only top-level tasks (no parent)
            if (Schema::hasColumn('tasks', 'parent_task_id')) {
                $tasksQuery->whereNull('tasks.parent_task_id');
            }

            $tasks = $tasksQuery->get();

            // Convert tasks to calendar events
            foreach ($tasks as $task) {
                $eventDate = null;
                $endEventDate = null;

                // Use due_date if available, otherwise start_date, otherwise created_at
                if (Schema::hasColumn('tasks', 'due_date') && $task->due_date) {
                    $eventDate = $task->due_date;
                } elseif (Schema::hasColumn('tasks', 'start_date') && $task->start_date) {
                    $eventDate = $task->start_date;
                } elseif (Schema::hasColumn('tasks', 'created_at')) {
                    $eventDate = date('Y-m-d', strtotime($task->created_at));
                }

                if (Schema::hasColumn('tasks', 'start_date') && $task->start_date && Schema::hasColumn('tasks', 'due_date') && $task->due_date) {
                    $endEventDate = $task->due_date;
                }

                if ($eventDate) {
                    $events[] = [
                        'id' => 'task_' . $task->id,
                        'title' => $task->title,
                        'type' => 'task',
                        'start' => $eventDate,
                        'end' => $endEventDate ?: $eventDate,
                        'color' => $this->getTaskColor($task->priority ?? 'medium', $task->status ?? 'todo'),
                        'task_id' => $task->id,
                        'project_id' => $task->project_id ?? null,
                        'project_name' => $task->project_name ?? null,
                        'status' => $task->status ?? 'todo',
                        'priority' => $task->priority ?? 'medium',
                        'assigned_to_name' => $task->assigned_to_name ?? null,
                        'assigned_to_id' => $task->assigned_to_id ?? null,
                        'description' => $task->description ?? null,
                    ];
                }
            }

            // Sort events by start date
            usort($events, function ($a, $b) {
                return strtotime($a['start']) - strtotime($b['start']);
            });

            return response()->json($events);
        } catch (\Exception $e) {
            Log::error('Error in getCalendarData', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to load calendar data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get color for project based on status
     */
    private function getProjectColor($status)
    {
        $colors = [
            'planning' => '#6366f1', // indigo
            'active' => '#10b981',   // green
            'on-hold' => '#f59e0b',  // amber
            'completed' => '#6b7280', // gray
            'cancelled' => '#ef4444', // red
        ];
        return $colors[$status] ?? '#6366f1';
    }

    /**
     * Get color for task based on priority and status
     */
    private function getTaskColor($priority, $status)
    {
        // Priority-based colors (override with status if completed)
        if ($status === 'done' || $status === 'completed') {
            return '#6b7280'; // gray for completed
        }

        $colors = [
            'urgent' => '#ef4444',   // red
            'high' => '#f59e0b',     // amber
            'medium' => '#3b82f6',   // blue
            'low' => '#10b981',      // green
        ];
        return $colors[$priority] ?? '#3b82f6';
    }
}

