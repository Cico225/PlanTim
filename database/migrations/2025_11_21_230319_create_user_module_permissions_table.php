<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // User Module Permissions - granular permissions per user per module
        Schema::create('user_module_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('module_name'); // e.g., 'crm', 'projects', 'dms', etc.
            $table->boolean('can_view')->default(false); // Can see module in menu
            $table->boolean('can_read')->default(false); // Can read/view data
            $table->boolean('can_create')->default(false); // Can create new records
            $table->boolean('can_update')->default(false); // Can edit existing records
            $table->boolean('can_delete')->default(false); // Can delete records
            $table->boolean('can_export')->default(false); // Can export data
            $table->boolean('can_import')->default(false); // Can import data
            $table->json('custom_permissions')->nullable(); // Module-specific permissions
            $table->timestamps();

            $table->unique(['user_id', 'module_name']);
            $table->index(['user_id', 'module_name']);
        });

        // System Modules - define available modules and their capabilities
        Schema::create('system_modules', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., 'crm', 'projects'
            $table->string('display_name'); // e.g., 'CRM', 'Projects'
            $table->string('description')->nullable();
            $table->string('icon')->nullable(); // Icon class/name
            $table->string('route')->nullable(); // Frontend route
            $table->json('available_permissions')->nullable(); // Available permissions for this module
            $table->boolean('is_active')->default(true);
            $table->boolean('is_plugin')->default(false); // Is this a plugin or core module
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Plugin Settings - for plugin-specific configurations
        Schema::create('plugin_settings', function (Blueprint $table) {
            $table->id();
            $table->string('plugin_name');
            $table->string('setting_key');
            $table->text('setting_value')->nullable();
            $table->string('setting_type')->default('string'); // string, boolean, integer, json
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['plugin_name', 'setting_key']);
            $table->index('plugin_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plugin_settings');
        Schema::dropIfExists('user_module_permissions');
        Schema::dropIfExists('system_modules');
    }
};
