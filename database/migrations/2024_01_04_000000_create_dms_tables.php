<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Folders
        Schema::create('dms_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_folder_id')->nullable()->constrained('dms_folders')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 20)->nullable();
            $table->string('icon', 50)->nullable();
            $table->boolean('is_shared')->default(false);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('parent_folder_id');
            $table->index('owner_id');
        });

        // Documents
        Schema::create('dms_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->nullable()->constrained('dms_folders')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->bigInteger('file_size');
            $table->string('mime_type', 100);
            $table->integer('version')->default(1);
            $table->boolean('is_locked')->default(false);
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->json('tags')->nullable();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('folder_id');
            $table->index('owner_id');
            $table->fullText('name');
        });

        // Document Versions
        Schema::create('dms_document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('dms_documents')->cascadeOnDelete();
            $table->integer('version');
            $table->string('file_name');
            $table->string('file_path');
            $table->bigInteger('file_size');
            $table->text('changes')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['document_id', 'version']);
        });

        // Permissions
        Schema::create('dms_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('permissionable_type');
            $table->unsignedBigInteger('permissionable_id');
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('role_id')->nullable()->constrained('roles')->cascadeOnDelete();
            $table->string('permission', 50);
            $table->timestamps();

            $table->index(['permissionable_type', 'permissionable_id']);
        });

        // Share Links
        Schema::create('dms_share_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('dms_documents')->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('password')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->integer('download_count')->default(0);
            $table->integer('max_downloads')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dms_share_links');
        Schema::dropIfExists('dms_permissions');
        Schema::dropIfExists('dms_document_versions');
        Schema::dropIfExists('dms_documents');
        Schema::dropIfExists('dms_folders');
    }
};

