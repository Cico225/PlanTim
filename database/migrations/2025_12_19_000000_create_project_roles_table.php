<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Project Roles - roles that can view/update projects
        Schema::create('project_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->boolean('can_view')->default(true);
            $table->boolean('can_edit')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->timestamp('assigned_at')->useCurrent();

            $table->unique(['project_id', 'role_id']);
            $table->index('project_id');
            $table->index('role_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_roles');
    }
};










