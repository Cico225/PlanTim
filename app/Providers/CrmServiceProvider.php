<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Crm\Account;
use App\Models\Crm\Contact;
use App\Models\Crm\Deal;
use App\Models\Crm\Activity;
use App\Observers\CrmAuditObserver;

class CrmServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $observer = new CrmAuditObserver(app(\App\Services\CrmWorkflowService::class));

        Account::observe($observer);
        Contact::observe($observer);
        Deal::observe($observer);
        Activity::observe($observer);
    }
}






















