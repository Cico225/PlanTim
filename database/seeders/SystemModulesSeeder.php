<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemModulesSeeder extends Seeder
{
    public function run(): void
    {
        // Migrate chat module permissions to inbox module
        DB::table('user_module_permissions')
            ->where('module_name', 'chat')
            ->update(['module_name' => 'inbox']);
        
        // Remove chat module if it exists (replaced by inbox module)
        DB::table('system_modules')->where('name', 'chat')->delete();
        
        $modules = [
            [
                'name' => 'dashboard',
                'display_name' => 'Dashboard',
                'description' => 'Main dashboard with overview and statistics',
                'icon' => 'FiHome',
                'route' => '/dashboard',
                'available_permissions' => json_encode(['view_stats', 'view_charts', 'export_reports']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'crm',
                'display_name' => 'CRM',
                'description' => 'Customer Relationship Management',
                'icon' => 'FiUsers',
                'route' => '/crm',
                'available_permissions' => json_encode(['manage_contacts', 'manage_companies', 'manage_deals', 'view_activities']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 2,
            ],
            [
                'name' => 'projects',
                'display_name' => 'Projects',
                'description' => 'Project Management System',
                'icon' => 'FiFolder',
                'route' => '/projects',
                'available_permissions' => json_encode(['manage_projects', 'manage_tasks', 'assign_users', 'view_reports']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 3,
            ],
            [
                'name' => 'dms',
                'display_name' => 'DMS',
                'description' => 'Document Management System',
                'icon' => 'FiFileText',
                'route' => '/dms',
                'available_permissions' => json_encode(['manage_documents', 'manage_folders', 'share_documents', 'version_control']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 4,
            ],
            [
                'name' => 'lms',
                'display_name' => 'LMS',
                'description' => 'Learning Management System',
                'icon' => 'FiBookOpen',
                'route' => '/lms',
                'available_permissions' => json_encode(['manage_courses', 'manage_lessons', 'track_progress', 'issue_certificates']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 5,
            ],
            [
                'name' => 'hrm',
                'display_name' => 'HRM',
                'description' => 'Human Resource Management',
                'icon' => 'FiUser',
                'route' => '/hrm',
                'available_permissions' => json_encode(['manage_employees', 'manage_departments', 'manage_leaves', 'track_time']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 6,
            ],
            [
                'name' => 'inbox',
                'display_name' => 'Interne Poruke',
                'description' => 'Internal Messages System',
                'icon' => 'FiMail',
                'route' => '/inbox',
                'available_permissions' => json_encode(['send_messages', 'view_messages', 'manage_messages', 'archive_messages']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 7,
            ],
            [
                'name' => 'notifications',
                'display_name' => 'Notifications',
                'description' => 'Notification Management System',
                'icon' => 'FiBell',
                'route' => '/notifications',
                'available_permissions' => json_encode(['view_notifications', 'manage_settings', 'send_broadcasts']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 8,
            ],
            [
                'name' => 'gdpr',
                'display_name' => 'GDPR',
                'description' => 'GDPR Compliance Management',
                'icon' => 'FiShield',
                'route' => '/gdpr',
                'available_permissions' => json_encode(['manage_consents', 'data_export', 'data_deletion', 'audit_logs']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 9,
            ],
            [
                'name' => 'office365',
                'display_name' => 'Office 365',
                'description' => 'Office 365 Integration',
                'icon' => 'FiCloud',
                'route' => '/office365',
                'available_permissions' => json_encode(['sync_calendar', 'sync_contacts', 'sync_emails', 'manage_integration']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 10,
            ],
            [
                'name' => 'planika',
                'parent_name' => null,
                'display_name' => 'Planika',
                'description' => 'Planika Integration Module',
                'icon' => 'FiPackage',
                'route' => '/planika',
                'available_permissions' => json_encode(['sync_data', 'manage_products', 'view_reports']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 11,
            ],
            [
                'name' => 'planika.finance',
                'parent_name' => 'planika',
                'display_name' => 'Finansije i računovodstvo',
                'description' => 'Finansijski podmodul Planika',
                'icon' => 'FiDollarSign',
                'route' => '/planika/finance',
                'available_permissions' => json_encode(['view_reports', 'manage_budgets']),
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
                'available_permissions' => json_encode(['import', 'pair', 'export', 'report']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 112,
            ],
            [
                'name' => 'planika.finance.ugovori',
                'parent_name' => 'planika.finance',
                'display_name' => 'Krediti — Spiskovi aktivnih ugovora',
                'description' => 'Pregled spiskova aktivnih kreditnih ugovora',
                'icon' => 'FiFileText',
                'route' => '/planika/finance/ugovori',
                'available_permissions' => json_encode(['view', 'export']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 113,
            ],
            [
                'name' => 'ai',
                'display_name' => 'AI Assistant',
                'description' => 'AI-powered features and automation',
                'icon' => 'FiCpu',
                'route' => '/ai',
                'available_permissions' => json_encode(['use_ai_chat', 'generate_documents', 'semantic_search', 'manage_ai_settings']),
                'is_active' => true,
                'is_plugin' => true,
                'sort_order' => 12,
            ],
            [
                'name' => 'meeting-rooms',
                'display_name' => 'Rezervacija Sala',
                'description' => 'Meeting room reservation and calendar',
                'icon' => 'FiCalendar',
                'route' => '/meeting-rooms',
                'available_permissions' => json_encode(['reserve_meeting_rooms', 'view_meeting_calendar', 'manage_reservations']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 13,
            ],
            [
                'name' => 'admin',
                'display_name' => 'Administration',
                'description' => 'System Administration and Settings',
                'icon' => 'FiSettings',
                'route' => '/admin',
                'available_permissions' => json_encode(['manage_users', 'manage_roles', 'manage_permissions', 'manage_modules', 'system_settings', 'view_logs', 'manage_backups']),
                'is_active' => true,
                'is_plugin' => false,
                'sort_order' => 14,
            ],
        ];

        foreach ($modules as $module) {
            if (!array_key_exists('parent_name', $module)) {
                $module['parent_name'] = null;
            }

            DB::table('system_modules')->updateOrInsert(
                ['name' => $module['name']],
                array_merge($module, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}