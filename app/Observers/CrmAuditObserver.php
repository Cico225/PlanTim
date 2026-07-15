<?php

namespace App\Observers;

use App\Models\Crm\Account;
use App\Models\Crm\Contact;
use App\Models\Crm\Deal;
use App\Models\Crm\Activity;
use App\Services\CrmWorkflowService;

class CrmAuditObserver
{
    protected $workflowService;

    public function __construct(CrmWorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    public function created($model): void
    {
        $this->logAudit($model, 'created');
    }

    public function updated($model): void
    {
        $this->logAudit($model, 'updated', $model->getOriginal(), $model->getChanges());
    }

    public function deleted($model): void
    {
        $this->logAudit($model, 'deleted');
    }

    protected function logAudit($model, string $action, ?array $oldValues = null, ?array $newValues = null): void
    {
        $entityType = $this->getEntityType($model);
        if (!$entityType) {
            return;
        }

        $this->workflowService->logAudit(
            $entityType,
            $model->id,
            $action,
            auth()->user(),
            $oldValues,
            $newValues
        );

        // Ažuriraj last_activity_date za Account i Contact
        if ($model instanceof Account || $model instanceof Contact) {
            $this->workflowService->updateLastActivityDate($entityType, $model->id);
        }

        // Deal specific workflows
        if ($model instanceof Deal) {
            $this->handleDealWorkflows($model, $action);
        }
    }

    protected function handleDealWorkflows(Deal $deal, string $action): void
    {
        if ($action === 'updated') {
            // Ako je deal prešao u closed-won, kreiraj projekt
            if ($deal->stage === 'closed-won' && !$deal->project_id) {
                $this->workflowService->createProjectFromDeal($deal);
            }

            // Kreiraj taskove za određene faze
            if (in_array($deal->stage, ['proposal', 'negotiation', 'closed-won'])) {
                $this->workflowService->createTasksForDealStage($deal, $deal->stage);
            }
        }
    }

    protected function getEntityType($model): ?string
    {
        return match (get_class($model)) {
            Account::class => 'account',
            Contact::class => 'contact',
            Deal::class => 'deal',
            Activity::class => 'activity',
            default => null,
        };
    }
}






















