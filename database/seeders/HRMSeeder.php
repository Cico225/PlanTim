<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HRMSeeder extends Seeder
{
    public function run(): void
    {
        // Create Departments
        $departments = [
            ['name' => 'Information Technology', 'description' => 'IT Department', 'manager_id' => null],
            ['name' => 'Human Resources', 'description' => 'HR Department', 'manager_id' => null],
            ['name' => 'Sales', 'description' => 'Sales Department', 'manager_id' => null],
            ['name' => 'Marketing', 'description' => 'Marketing Department', 'manager_id' => null],
            ['name' => 'Finance', 'description' => 'Finance Department', 'manager_id' => null],
        ];

        foreach ($departments as $dept) {
            DB::table('hrm_departments')->insert(array_merge($dept, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // Create Leave Types
        $leaveTypes = [
            ['name' => 'Godišnji odmor', 'description' => 'Annual leave', 'days_per_year' => 20, 'is_paid' => true, 'requires_approval' => true, 'color' => '#10b981'],
            ['name' => 'Bolovanje', 'description' => 'Sick leave', 'days_per_year' => 0, 'is_paid' => true, 'requires_approval' => false, 'color' => '#ef4444'],
            ['name' => 'Porodiljsko odsustvo', 'description' => 'Maternity/Paternity leave', 'days_per_year' => 0, 'is_paid' => true, 'requires_approval' => true, 'color' => '#8b5cf6'],
            ['name' => 'Neplaćeno odsustvo', 'description' => 'Unpaid leave', 'days_per_year' => 0, 'is_paid' => false, 'requires_approval' => true, 'color' => '#6b7280'],
        ];

        foreach ($leaveTypes as $type) {
            DB::table('hrm_leave_types')->insert(array_merge($type, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->command->info('HRM data seeded successfully!');
    }
}

