<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Central registry for Planika submodules shown in Administration → Module permissions.
 *
 * When adding a new Planika submodule:
 * 1. Add an entry to definitions()
 * 2. Run: php artisan modules:sync
 * 3. Wire ModuleAccessGuard / ModulePermissionHelper in the feature controller
 */
class PlanikaModuleRegistry
{
    public static function definitions(): array
    {
        return [
            [
                'name' => 'planika.maloprodaja',
                'parent_name' => 'planika',
                'display_name' => 'Maloprodaja',
                'description' => 'Hub maloprodaje — operativni rad i reklamacije',
                'icon' => 'FiShoppingBag',
                'route' => '/planika/retail',
                'available_permissions' => [],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 121,
            ],
            [
                'name' => 'planika.maloprodaja.operativni',
                'parent_name' => 'planika.maloprodaja',
                'display_name' => 'Plan i evidencija obilazaka',
                'description' => 'Obilasci, kontrole, edukacije i evaluacije prodavnica',
                'icon' => 'FiClipboard',
                'route' => '/maloprodaja',
                'available_permissions' => [
                    'controls_create',
                    'controls_review',
                    'evaluations_create',
                    'plans_manage',
                    'stores_manage',
                    'reports_view',
                    'reports_view_all',
                ],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 122,
            ],
            [
                'name' => 'planika.maloprodaja.reklamacije',
                'parent_name' => 'planika.maloprodaja',
                'display_name' => 'Reklamacije',
                'description' => 'Unos i obrada reklamacija iz maloprodaje',
                'icon' => 'FiMessageSquare',
                'route' => '/planika/retail/reklamacije',
                'available_permissions' => ['create', 'view_own', 'review', 'view_all'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 123,
            ],
            [
                'name' => 'planika.finance',
                'parent_name' => 'planika',
                'display_name' => 'Finansije i računovodstvo',
                'description' => 'Finansijski podmodul Planika',
                'icon' => 'FiDollarSign',
                'route' => '/planika/finance',
                'available_permissions' => ['view_reports', 'manage_budgets'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 111,
            ],
            [
                'name' => 'planika.finance.krediti',
                'parent_name' => 'planika.finance',
                'display_name' => 'Krediti — Upravljanje administrativnim zabranama',
                'description' => 'Uvoz, uparivanje administrativnih zabrana i izvještaji',
                'icon' => 'FiCreditCard',
                'route' => '/planika/finance/krediti',
                'available_permissions' => ['import', 'pair', 'export', 'report'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 112,
            ],
            [
                'name' => 'planika.finance.ugovori',
                'parent_name' => 'planika.finance',
                'display_name' => 'Spiskovi aktivnih ugovora',
                'description' => 'Firme sa potpisanim ugovorom, spiskovi uposlenika i uvoz Excel-a',
                'icon' => 'FiFileText',
                'route' => '/planika/finance/ugovori',
                'available_permissions' => ['view', 'manage', 'import'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 113,
            ],
            [
                'name' => 'planika.hr',
                'parent_name' => 'planika',
                'display_name' => 'Ljudski resursi',
                'description' => 'HR hub — zaposleni, ATS, ugovori, odsustva i izvještaji',
                'icon' => 'FiUsers',
                'route' => '/planika/hr',
                'available_permissions' => [],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 130,
            ],
            [
                'name' => 'planika.hr.dashboard',
                'parent_name' => 'planika.hr',
                'display_name' => 'Pregled',
                'description' => 'HR dashboard i statistike',
                'icon' => 'FiBarChart2',
                'route' => '/planika/hr/dashboard',
                'available_permissions' => ['view'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 131,
            ],
            [
                'name' => 'planika.hr.employees',
                'parent_name' => 'planika.hr',
                'display_name' => 'Zaposleni',
                'description' => 'Upravljanje zaposlenicima',
                'icon' => 'FiUsers',
                'route' => '/planika/hr/employees',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 132,
            ],
            [
                'name' => 'planika.hr.departments',
                'parent_name' => 'planika.hr',
                'display_name' => 'Odjeli',
                'description' => 'Organizacijska struktura',
                'icon' => 'FiHome',
                'route' => '/planika/hr/departments',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 133,
            ],
            [
                'name' => 'planika.hr.ats',
                'parent_name' => 'planika.hr',
                'display_name' => 'ATS',
                'description' => 'Applicant Tracking System',
                'icon' => 'FiBriefcase',
                'route' => '/planika/hr/ats',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 134,
            ],
            [
                'name' => 'planika.hr.onboarding',
                'parent_name' => 'planika.hr',
                'display_name' => 'Onboarding',
                'description' => 'Prijem novih zaposlenika',
                'icon' => 'FiUserPlus',
                'route' => '/planika/hr/onboarding',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 135,
            ],
            [
                'name' => 'planika.hr.contracts',
                'parent_name' => 'planika.hr',
                'display_name' => 'Ugovori o radu',
                'description' => 'Generisanje i upravljanje ugovorima o radu (FBiH, RS, BD)',
                'icon' => 'FiFileText',
                'route' => '/planika/hr/contracts',
                'available_permissions' => ['view', 'manage', 'renew', 'generate'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 136,
            ],
            [
                'name' => 'planika.hr.decisions',
                'parent_name' => 'planika.hr',
                'display_name' => 'Rješenja i odluke',
                'description' => 'Rješenja i odluke',
                'icon' => 'FiClipboard',
                'route' => '/planika/hr/decisions',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 137,
            ],
            [
                'name' => 'planika.hr.attendance',
                'parent_name' => 'planika.hr',
                'display_name' => 'Evidencije rada',
                'description' => 'Radno vrijeme i evidencije',
                'icon' => 'FiClock',
                'route' => '/planika/hr/attendance',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 138,
            ],
            [
                'name' => 'planika.hr.leaves',
                'parent_name' => 'planika.hr',
                'display_name' => 'Odsustva',
                'description' => 'Godišnji i bolovanja',
                'icon' => 'FiCalendar',
                'route' => '/planika/hr/leaves',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 139,
            ],
            [
                'name' => 'planika.hr.education',
                'parent_name' => 'planika.hr',
                'display_name' => 'Edukacije',
                'description' => 'Programi, prijave, certifikati i planovi razvoja',
                'icon' => 'FiBookOpen',
                'route' => '/planika/hr/education',
                'available_permissions' => ['view', 'manage', 'enroll'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 140,
            ],
            [
                'name' => 'planika.hr.talent',
                'parent_name' => 'planika.hr',
                'display_name' => 'Talent Management',
                'description' => 'Talent pool, 9-box, razvojne putanje i sukcesija',
                'icon' => 'FiStar',
                'route' => '/planika/hr/talent',
                'available_permissions' => ['view', 'manage', 'assess'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 141,
            ],
            [
                'name' => 'planika.hr.evaluations',
                'parent_name' => 'planika.hr',
                'display_name' => 'Evaluacije',
                'description' => 'Ocjene i GO/NO-GO',
                'icon' => 'FiAward',
                'route' => '/planika/hr/evaluations',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 142,
            ],
            [
                'name' => 'planika.hr.offboarding',
                'parent_name' => 'planika.hr',
                'display_name' => 'Offboarding',
                'description' => 'Odlazak zaposlenika',
                'icon' => 'FiUserMinus',
                'route' => '/planika/hr/offboarding',
                'available_permissions' => ['view', 'manage'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 143,
            ],
            [
                'name' => 'planika.hr.reports',
                'parent_name' => 'planika.hr',
                'display_name' => 'Izvještaji',
                'description' => 'HR analitika i izvještaji',
                'icon' => 'FiBarChart2',
                'route' => '/planika/hr/reports',
                'available_permissions' => ['view', 'export'],
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 144,
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
