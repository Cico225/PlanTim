<?php

namespace App\Services;

use App\Models\Crm\Deal;
use App\Models\Crm\Account;
use App\Models\Crm\Contact;
use App\Models\Crm\Activity;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

class CrmWorkflowService
{
    /**
     * Automatski kreiraj projekt kada je deal zatvoren kao won
     */
    public function createProjectFromDeal(Deal $deal): ?Project
    {
        if ($deal->stage !== 'closed-won' || $deal->project_id) {
            return null;
        }

        try {
            DB::beginTransaction();

            $project = Project::create([
                'name' => "Projekt: {$deal->title}",
                'description' => $deal->description ?? "Projekt kreiran iz deal-a: {$deal->title}",
                'client_id' => $deal->company_id,
                'status' => 'planning',
                'priority' => 'high',
                'budget' => $deal->value,
                'currency' => $deal->currency,
                'owner_id' => $deal->owner_id,
                'created_by' => $deal->created_by,
            ]);

            // Poveži deal sa projektom
            $deal->update(['project_id' => $project->id]);
            $deal->projects()->attach($project->id);

            // Kopiraj kontakte iz deal-a u projekt (ako postoje)
            if ($deal->contact_id) {
                // Može se dodati logika za dodavanje kontakta kao člana projekta
            }

            DB::commit();

            Log::info("Project created from deal", [
                'deal_id' => $deal->id,
                'project_id' => $project->id,
            ]);

            return $project;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to create project from deal", [
                'deal_id' => $deal->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Kreiraj taskove za deal po fazama
     */
    public function createTasksForDealStage(Deal $deal, string $stage): void
    {
        $taskConfigs = $this->getTaskConfigsForStage($stage);

        foreach ($taskConfigs as $config) {
            try {
                $task = Task::create([
                    'project_id' => $deal->project_id ?? null, // Ako postoji projekt
                    'title' => $config['title'],
                    'description' => $config['description'] ?? null,
                    'status' => 'todo',
                    'priority' => $config['priority'] ?? 'medium',
                    'assigned_to' => $config['assigned_to'] ?? $deal->owner_id,
                    'due_date' => $config['due_date'] ?? $deal->expected_close_date,
                    'created_by' => $deal->owner_id,
                ]);

                // Poveži task sa deal-om
                $deal->tasks()->attach($task->id, [
                    'task_type' => $config['task_type'] ?? 'follow_up',
                ]);

                Log::info("Task created for deal stage", [
                    'deal_id' => $deal->id,
                    'task_id' => $task->id,
                    'stage' => $stage,
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to create task for deal stage", [
                    'deal_id' => $deal->id,
                    'stage' => $stage,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Konfiguracija taskova po fazama
     */
    private function getTaskConfigsForStage(string $stage): array
    {
        $configs = [
            'proposal' => [
                [
                    'title' => 'Pripremi ponudu',
                    'description' => 'Kreiraj detaljnu ponudu za klijenta',
                    'priority' => 'high',
                    'task_type' => 'proposal',
                ],
            ],
            'negotiation' => [
                [
                    'title' => 'Follow-up pregovori',
                    'description' => 'Kontaktiraj klijenta za pregovore',
                    'priority' => 'high',
                    'task_type' => 'negotiation',
                ],
            ],
            'closed-won' => [
                [
                    'title' => 'Kreiraj projekt',
                    'description' => 'Pokreni projekt za dobiveni deal',
                    'priority' => 'urgent',
                    'task_type' => 'project_setup',
                ],
            ],
        ];

        return $configs[$stage] ?? [];
    }

    /**
     * Provjeri nema aktivnosti i pošalji notifikaciju
     */
    public function checkInactiveAccounts(int $days = 14): void
    {
        $cutoffDate = now()->subDays($days);

        $accounts = Account::where('status', 'active')
            ->where(function ($query) use ($cutoffDate) {
                $query->whereNull('last_activity_date')
                    ->orWhere('last_activity_date', '<', $cutoffDate);
            })
            ->get();

        foreach ($accounts as $account) {
            if ($account->owner_id) {
                // Pošalji notifikaciju vlasniku
                // Notification::send($account->owner, new InactiveAccountNotification($account));
                Log::info("Inactive account detected", [
                    'account_id' => $account->id,
                    'owner_id' => $account->owner_id,
                ]);
            }
        }
    }

    /**
     * Ažuriraj last_activity_date za entitet
     */
    public function updateLastActivityDate(string $entityType, int $entityId): void
    {
        $model = match ($entityType) {
            'account' => Account::class,
            'contact' => Contact::class,
            default => null,
        };

        if ($model) {
            $model::where('id', $entityId)->update([
                'last_activity_date' => now(),
            ]);
        }
    }

    /**
     * Kreiraj audit log zapis
     */
    public function logAudit(
        string $entityType,
        int $entityId,
        string $action,
        ?User $user = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null
    ): void {
        try {
            \App\Models\Crm\AuditLog::create([
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'action' => $action,
                'user_id' => $user?->id ?? auth()->id(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'description' => $description,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to create audit log", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Kreiraj timeline aktivnosti za entitet
     */
    public function getTimeline(string $entityType, int $entityId): array
    {
        $timeline = [];
        
        // Map entity type to column name
        $entityColumnMap = [
            'account' => 'company_id',
            'contact' => 'contact_id',
            'deal' => 'deal_id',
        ];
        
        $entityColumn = $entityColumnMap[$entityType] ?? null;
        
        if (!$entityColumn || !Schema::hasTable('crm_activities')) {
            return $timeline;
        }

        // Aktivnosti - koristi DB facade
        $activitiesQuery = DB::table('crm_activities')
            ->select('crm_activities.*')
            ->where('crm_activities.' . $entityColumn, $entityId);
        
        // Only include non-deleted activities
        if (Schema::hasColumn('crm_activities', 'deleted_at')) {
            $activitiesQuery->whereNull('crm_activities.deleted_at');
        }
        
        // Join users if owner_id or user_id exists
        if (Schema::hasColumn('crm_activities', 'owner_id')) {
            $activitiesQuery->leftJoin('users', 'crm_activities.owner_id', '=', 'users.id')
                ->addSelect('users.name as owner_name');
        } elseif (Schema::hasColumn('crm_activities', 'user_id')) {
            $activitiesQuery->leftJoin('users', 'crm_activities.user_id', '=', 'users.id')
                ->addSelect('users.name as owner_name');
        }
        
        $activitiesQuery->orderBy('crm_activities.created_at', 'desc');
        $activities = $activitiesQuery->get();

        foreach ($activities as $activity) {
            // Determine date - use scheduled_at, due_date, or created_at
            $date = $activity->scheduled_at ?? $activity->due_date ?? $activity->created_at;
            
            $timeline[] = [
                'type' => 'activity',
                'id' => $activity->id,
                'title' => $activity->subject ?? '',
                'description' => $activity->description ?? null,
                'date' => $date,
                'user' => $activity->owner_name ?? null,
            ];
        }

        // Audit logovi - samo ako tabela postoji
        if (Schema::hasTable('crm_audit_logs')) {
            $auditLogsQuery = DB::table('crm_audit_logs')
                ->select('crm_audit_logs.*')
                ->where('crm_audit_logs.entity_type', $entityType)
                ->where('crm_audit_logs.entity_id', $entityId);
            
            // Join users if user_id exists
            if (Schema::hasColumn('crm_audit_logs', 'user_id')) {
                $auditLogsQuery->leftJoin('users', 'crm_audit_logs.user_id', '=', 'users.id')
                    ->addSelect('users.name as user_name');
            }
            
            $auditLogsQuery->orderBy('crm_audit_logs.created_at', 'desc');
            $auditLogs = $auditLogsQuery->get();

            foreach ($auditLogs as $log) {
                $timeline[] = [
                    'type' => 'audit',
                    'id' => $log->id,
                    'title' => ucfirst($log->action ?? ''),
                    'description' => $log->description ?? null,
                    'date' => $log->created_at,
                    'user' => $log->user_name ?? null,
                ];
            }
        }

        // Sortiraj po datumu
        usort($timeline, function ($a, $b) {
            $dateA = $a['date'] ?? '1970-01-01';
            $dateB = $b['date'] ?? '1970-01-01';
            return strtotime($dateB) <=> strtotime($dateA);
        });

        return $timeline;
    }
}


