<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Remove old chat permissions (by name pattern)
        Permission::where('name', 'like', 'chat.%')->delete();

        // Define all modules
        $modules = [
            'dashboard' => 'Dashboard',
            'crm' => 'CRM',
            'projects' => 'Project Management',
            'dms' => 'Document Management',
            'lms' => 'Learning Management',
            'hrm' => 'Human Resources',
            'inbox' => 'Interne Poruke',
            'notifications' => 'Notifications',
            'gdpr' => 'GDPR',
            'office365' => 'Office 365',
            'planika' => 'Planika',
            'ai' => 'AI Module',
            'administration' => 'Administration',
        ];

        // Define permissions for each module
        $actions = ['view', 'create', 'update', 'delete', 'manage'];

        foreach ($modules as $module => $displayName) {
            foreach ($actions as $action) {
                Permission::updateOrCreate(
                    [
                        'name' => "{$module}.{$action}",
                        'guard_name' => 'web',
                    ]
                );
            }
        }

        // Special permissions
        Permission::updateOrCreate(
            [
                'name' => 'users.impersonate',
                'guard_name' => 'web',
            ]
        );

        // Planika Maloprodaja specific permissions
        $maloprodajaPermissions = [
            'planika.maloprodaja.view' => 'View Maloprodaja',
            'planika.maloprodaja.regions.manage' => 'Manage Regions',
            'planika.maloprodaja.stores.manage' => 'Manage Stores',
            'planika.maloprodaja.plans.manage' => 'Manage Activity Plans',
            'planika.maloprodaja.plans.assign' => 'Assign Plans',
            'planika.maloprodaja.controls.create' => 'Create Store Controls',
            'planika.maloprodaja.controls.view' => 'View Store Controls',
            'planika.maloprodaja.controls.review' => 'Review Store Controls',
            'planika.maloprodaja.evaluations.create' => 'Create Evaluations',
            'planika.maloprodaja.evaluations.view' => 'View Evaluations',
            'planika.maloprodaja.evaluations.view_own' => 'View Own Evaluations',
            'planika.maloprodaja.forms.manage' => 'Manage Control Forms',
            'planika.maloprodaja.criteria.manage' => 'Manage Evaluation Criteria',
            'planika.maloprodaja.reports.view' => 'View Reports',
            'planika.maloprodaja.reports.view_all' => 'View All Reports',
            'planika.maloprodaja.complaints.create' => 'Create Retail Complaints',
            'planika.maloprodaja.complaints.view_own' => 'View Own Store Complaints',
            'planika.maloprodaja.complaints.review' => 'Review Retail Complaints',
            'planika.maloprodaja.complaints.view_all' => 'View All Retail Complaints',
        ];

        foreach ($maloprodajaPermissions as $name => $displayName) {
            Permission::updateOrCreate(
                [
                    'name' => $name,
                    'guard_name' => 'web',
                ]
            );
        }

        // Planika Finansije — ugovori
        $financePermissions = [
            'planika.finance.ugovori.view' => 'View contract companies',
            'planika.finance.ugovori.manage' => 'Manage contract companies',
            'planika.finance.ugovori.import' => 'Import contract companies',
        ];

        foreach ($financePermissions as $name => $displayName) {
            Permission::updateOrCreate(
                ['name' => $name, 'guard_name' => 'web']
            );
        }

        // Create Roles
        $superAdmin = Role::firstOrCreate(
            ['name' => 'super-admin', 'guard_name' => 'web']
        );

        $admin = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web']
        );

        $manager = Role::firstOrCreate(
            ['name' => 'manager', 'guard_name' => 'web']
        );

        $employee = Role::firstOrCreate(
            ['name' => 'employee', 'guard_name' => 'web']
        );

        $client = Role::firstOrCreate(
            ['name' => 'client', 'guard_name' => 'web']
        );

        // Assign all permissions to super-admin
        $superAdmin->givePermissionTo(Permission::all());

        // Assign most permissions to admin (except GDPR manage and user impersonate)
        $admin->givePermissionTo(
            Permission::where('name', 'not like', 'gdpr.%')
                ->where('name', '!=', 'users.impersonate')
                ->get()
        );

        // Manager permissions
        $manager->givePermissionTo([
            'dashboard.view',
            'crm.view', 'crm.create', 'crm.update',
            'projects.view', 'projects.create', 'projects.update',
            'dms.view', 'dms.create', 'dms.update',
            'lms.view',
            'inbox.view', 'inbox.create',
            'notifications.view',
        ]);

        // Employee permissions
        $employee->givePermissionTo([
            'dashboard.view',
            'crm.view',
            'projects.view',
            'dms.view', 'dms.create',
            'lms.view',
            'inbox.view', 'inbox.create',
            'notifications.view',
        ]);

        // Client permissions (limited)
        $client->givePermissionTo([
            'dashboard.view',
            'projects.view',
            'dms.view',
            'inbox.view', 'inbox.create',
        ]);

        // Planika Maloprodaja Roles
        $direktorMaloprodaje = Role::firstOrCreate(
            ['name' => 'direktor-maloprodaje', 'guard_name' => 'web']
        );

        $regionalniMenadzer = Role::firstOrCreate(
            ['name' => 'regionalni-menadzer', 'guard_name' => 'web']
        );

        $sefProdavnice = Role::firstOrCreate(
            ['name' => 'sef-prodavnice', 'guard_name' => 'web']
        );

        $prodavac = Role::firstOrCreate(
            ['name' => 'prodavac', 'guard_name' => 'web']
        );

        // Direktor Maloprodaje permissions
        $direktorMaloprodaje->givePermissionTo([
            'planika.maloprodaja.view',
            'planika.maloprodaja.regions.manage',
            'planika.maloprodaja.stores.manage',
            'planika.maloprodaja.plans.manage',
            'planika.maloprodaja.plans.assign',
            'planika.maloprodaja.controls.create',
            'planika.maloprodaja.controls.view',
            'planika.maloprodaja.controls.review',
            'planika.maloprodaja.evaluations.create',
            'planika.maloprodaja.evaluations.view',
            'planika.maloprodaja.forms.manage',
            'planika.maloprodaja.criteria.manage',
            'planika.maloprodaja.reports.view',
            'planika.maloprodaja.reports.view_all',
            'planika.maloprodaja.complaints.create',
            'planika.maloprodaja.complaints.view_own',
            'planika.maloprodaja.complaints.review',
            'planika.maloprodaja.complaints.view_all',
        ]);

        // Regionalni Menadžer permissions
        $regionalniMenadzer->givePermissionTo([
            'planika.maloprodaja.view',
            'planika.maloprodaja.controls.create',
            'planika.maloprodaja.controls.view',
            'planika.maloprodaja.evaluations.create',
            'planika.maloprodaja.evaluations.view',
            'planika.maloprodaja.reports.view',
            'planika.maloprodaja.complaints.view_all',
            'planika.maloprodaja.complaints.review',
        ]);

        // Šef Prodavnice permissions
        $sefProdavnice->givePermissionTo([
            'planika.maloprodaja.view',
            'planika.maloprodaja.controls.view',
            'planika.maloprodaja.evaluations.view',
            'planika.maloprodaja.complaints.create',
            'planika.maloprodaja.complaints.view_own',
        ]);

        // Prodavač permissions
        $prodavac->givePermissionTo([
            'planika.maloprodaja.view',
            'planika.maloprodaja.evaluations.view_own',
            'planika.maloprodaja.complaints.create',
            'planika.maloprodaja.complaints.view_own',
        ]);

        $this->command->info('Roles and Permissions seeded successfully!');
    }
}

