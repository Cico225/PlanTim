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
        // Role Module Permissions - granular permissions per role per module
        Schema::create('role_module_permissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('role_id');
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

            $table->foreign('role_id')
                ->references('id')
                ->on('roles')
                ->onDelete('cascade');

            $table->unique(['role_id', 'module_name']);
            $table->index(['role_id', 'module_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_module_permissions');
    }
};

