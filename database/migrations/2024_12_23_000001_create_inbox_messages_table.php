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
        Schema::create('inbox_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
            $table->string('subject');
            $table->text('message');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->boolean('is_deleted_by_sender')->default(false);
            $table->boolean('is_deleted_by_recipient')->default(false);
            $table->foreignId('parent_id')->nullable()->constrained('inbox_messages')->onDelete('set null');
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['recipient_id', 'is_read', 'is_deleted_by_recipient'], 'inbox_recipient_idx');
            $table->index(['sender_id', 'is_deleted_by_sender'], 'inbox_sender_idx');
            $table->index('parent_id', 'inbox_parent_idx');
            $table->index('created_at', 'inbox_created_idx');
        });

        // Tabela za praćenje ko ima dozvolu slati poruke
        Schema::create('inbox_senders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->boolean('can_send')->default(true);
            $table->string('note')->nullable();
            $table->foreignId('granted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->unique('user_id');
        });

        // Tabela za priloge (attachments)
        Schema::create('inbox_message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('inbox_messages')->onDelete('cascade');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inbox_message_attachments');
        Schema::dropIfExists('inbox_senders');
        Schema::dropIfExists('inbox_messages');
    }
};

