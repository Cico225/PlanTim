<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * LMS submodule registry for Administration → Moduli i Plugini.
 *
 * Run: php artisan modules:sync
 */
class LmsModuleRegistry
{
    public static function definitions(): array
    {
        return [
            [
                'name' => 'lms.maloprodaja',
                'parent_name' => 'lms',
                'display_name' => 'Maloprodaja — Put učenja',
                'description' => 'LMS hub za maloprodaju (napredak, katalog, bedževi, certifikati)',
                'icon' => 'FiBookOpen',
                'route' => '/lms/maloprodaja',
                'available_permissions' => ['view'],
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 51,
            ],
            [
                'name' => 'lms.maloprodaja.manage',
                'parent_name' => 'lms.maloprodaja',
                'display_name' => 'Upravljanje kursevima',
                'description' => 'Kreiranje i uređivanje kurseva, lekcija, kvizova i iznenađenja',
                'icon' => 'FiSettings',
                'route' => '/lms/maloprodaja/manage',
                'available_permissions' => [
                    'manage_courses',
                    'manage_lessons',
                    'manage_quizzes',
                    'manage_surprises',
                    'manage_badges',
                    'manage_certificates',
                ],
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 52,
            ],
            [
                'name' => 'lms.maloprodaja.reports',
                'parent_name' => 'lms.maloprodaja',
                'display_name' => 'LMS Izvještaji',
                'description' => 'Analitika napretka, završenosti kurseva i rezultata kvizova',
                'icon' => 'FiBarChart2',
                'route' => '/lms/maloprodaja/reports',
                'available_permissions' => ['view_reports', 'export_reports'],
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 53,
            ],
            [
                'name' => 'lms.direkcija',
                'parent_name' => 'lms',
                'display_name' => 'Direkcija — Sistem za učenje',
                'description' => 'LMS hub za direkciju (u pripremi)',
                'icon' => 'FiBriefcase',
                'route' => '/lms/direkcija',
                'available_permissions' => ['view'],
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 54,
            ],
        ];
    }

    public static function sync(): int
    {
        $count = 0;

        foreach (self::definitions() as $module) {
            $permissions = $module['available_permissions'] ?? [];
            unset($module['available_permissions']);

            $exists = DB::table('system_modules')->where('name', $module['name'])->exists();
            $payload = array_merge($module, [
                'available_permissions' => json_encode($permissions),
                'updated_at' => now(),
            ]);

            if (!$exists) {
                $payload['created_at'] = now();
            }

            DB::table('system_modules')->updateOrInsert(['name' => $module['name']], $payload);
            $count++;
        }

        return $count;
    }
}
