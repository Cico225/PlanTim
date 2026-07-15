<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Create Super Admin
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@plantim.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'locale' => 'bs',
            'theme' => 'light',
            'is_active' => true,
        ]);
        $superAdmin->assignRole('super-admin');

        // Create Admin
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@plantim.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'locale' => 'bs',
            'theme' => 'light',
            'is_active' => true,
        ]);
        $admin->assignRole('admin');

        // Create Manager
        $manager = User::create([
            'name' => 'Manager User',
            'email' => 'manager@plantim.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'locale' => 'bs',
            'theme' => 'light',
            'is_active' => true,
        ]);
        $manager->assignRole('manager');

        // Create Employee
        $employee = User::create([
            'name' => 'Employee User',
            'email' => 'employee@plantim.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'locale' => 'bs',
            'theme' => 'light',
            'is_active' => true,
        ]);
        $employee->assignRole('employee');

        // Create Test Users
        User::factory(10)->create()->each(function ($user) {
            $user->assignRole('employee');
        });

        $this->command->info('Admin users created successfully!');
        $this->command->info('Login credentials:');
        $this->command->info('Super Admin: superadmin@plantim.com / password');
        $this->command->info('Admin: admin@plantim.com / password');
        $this->command->info('Manager: manager@plantim.com / password');
        $this->command->info('Employee: employee@plantim.com / password');
    }
}

