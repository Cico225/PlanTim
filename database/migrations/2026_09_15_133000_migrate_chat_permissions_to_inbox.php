<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_module_permissions')) {
            DB::table('user_module_permissions')
                ->where('module_name', 'chat')
                ->update(['module_name' => 'inbox']);
        }

        if (Schema::hasTable('role_module_permissions')) {
            DB::table('role_module_permissions')
                ->where('module_name', 'chat')
                ->update(['module_name' => 'inbox']);
        }

        if (Schema::hasTable('system_modules')) {
            DB::table('system_modules')->where('name', 'chat')->delete();
        }
    }

    public function down(): void
    {
        // irreversible data migration
    }
};
