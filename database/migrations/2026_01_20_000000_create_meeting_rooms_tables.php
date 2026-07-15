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
        // Meeting Rooms table
        if (!Schema::hasTable('meeting_rooms')) {
            Schema::create('meeting_rooms', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // e.g., "Sala za sastanke - 3. sprat"
                $table->string('location')->nullable(); // e.g., "3. sprat"
                $table->text('description')->nullable();
                $table->integer('capacity')->nullable(); // Broj mjesta
                $table->json('equipment')->nullable(); // Oprema (projektor, tabla, itd.)
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // Meeting Reservations table
        if (!Schema::hasTable('meeting_reservations')) {
            Schema::create('meeting_reservations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('room_id')->constrained('meeting_rooms')->cascadeOnDelete();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->string('title'); // Naziv sastanka
                $table->text('description')->nullable();
                $table->dateTime('start_time'); // Početak termina
                $table->dateTime('end_time'); // Kraj termina
                $table->json('participants')->nullable(); // Lista učesnika (user IDs)
                $table->timestamps();

                // Indexes for performance
                $table->index(['room_id', 'start_time', 'end_time']);
                $table->index(['created_by']);
                $table->index('start_time');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meeting_reservations');
        Schema::dropIfExists('meeting_rooms');
    }
};







