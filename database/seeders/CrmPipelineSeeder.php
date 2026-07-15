<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Crm\Pipeline;
use App\Models\Crm\DealStage;

class CrmPipelineSeeder extends Seeder
{
    public function run(): void
    {
        // Default Sales Pipeline
        $salesPipeline = Pipeline::create([
            'name' => 'Sales Pipeline',
            'description' => 'Standardni prodajni pipeline',
            'is_default' => true,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $salesStages = [
            ['name' => 'Lead', 'stage_key' => 'lead', 'sort_order' => 1, 'default_probability' => 10, 'color' => '#9CA3AF'],
            ['name' => 'Kvalificiran', 'stage_key' => 'qualified', 'sort_order' => 2, 'default_probability' => 25, 'color' => '#3B82F6'],
            ['name' => 'Ponuda', 'stage_key' => 'proposal', 'sort_order' => 3, 'default_probability' => 50, 'color' => '#F59E0B'],
            ['name' => 'Pregovori', 'stage_key' => 'negotiation', 'sort_order' => 4, 'default_probability' => 75, 'color' => '#EF4444'],
            ['name' => 'Dobiven', 'stage_key' => 'closed-won', 'sort_order' => 5, 'default_probability' => 100, 'color' => '#10B981'],
            ['name' => 'Izgubljen', 'stage_key' => 'closed-lost', 'sort_order' => 6, 'default_probability' => 0, 'color' => '#6B7280'],
        ];

        foreach ($salesStages as $stage) {
            DealStage::create(array_merge($stage, ['pipeline_id' => $salesPipeline->id]));
        }

        // Upsell Pipeline
        $upsellPipeline = Pipeline::create([
            'name' => 'Upsell Pipeline',
            'description' => 'Pipeline za prodaju dodatnih usluga postojećim klijentima',
            'is_default' => false,
            'sort_order' => 2,
            'is_active' => true,
        ]);

        $upsellStages = [
            ['name' => 'Identifikacija prilike', 'stage_key' => 'lead', 'sort_order' => 1, 'default_probability' => 20, 'color' => '#3B82F6'],
            ['name' => 'Analiza potreba', 'stage_key' => 'qualified', 'sort_order' => 2, 'default_probability' => 40, 'color' => '#F59E0B'],
            ['name' => 'Ponuda', 'stage_key' => 'proposal', 'sort_order' => 3, 'default_probability' => 60, 'color' => '#EF4444'],
            ['name' => 'Odobrenje', 'stage_key' => 'negotiation', 'sort_order' => 4, 'default_probability' => 80, 'color' => '#10B981'],
            ['name' => 'Zatvoreno', 'stage_key' => 'closed-won', 'sort_order' => 5, 'default_probability' => 100, 'color' => '#10B981'],
        ];

        foreach ($upsellStages as $stage) {
            DealStage::create(array_merge($stage, ['pipeline_id' => $upsellPipeline->id]));
        }
    }
}






















