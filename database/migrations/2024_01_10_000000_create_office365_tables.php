<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Office 365 Connections
        Schema::create('office365_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->text('access_token');
            $table->text('refresh_token');
            $table->timestamp('expires_at');
            $table->text('scope')->nullable();
            $table->string('email');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();
        });

        // Office 365 Calendar Sync
        Schema::create('office365_calendar_sync', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('office365_event_id');
            $table->unsignedBigInteger('local_event_id')->nullable();
            $table->json('event_data');
            $table->timestamp('synced_at');

            $table->index(['user_id', 'office365_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('office365_calendar_sync');
        Schema::dropIfExists('office365_connections');
    }
};

