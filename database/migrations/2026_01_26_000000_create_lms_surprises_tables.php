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
        // Course Surprises Settings - podešavanja iznenađenja za kurs
        if (!Schema::hasTable('lms_course_surprises')) {
            Schema::create('lms_course_surprises', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                
                // Grebalice (Scratch Cards) Settings
                $table->boolean('scratch_card_enabled')->default(false);
                $table->boolean('scratch_card_after_quiz')->default(true); // Aktivira se nakon polaganja kviza
                $table->integer('scratch_card_cooldown_hours')->default(24); // Koliko sati između pokušaja
                
                // Spin the Wheel Settings
                $table->boolean('spin_wheel_enabled')->default(false);
                $table->boolean('spin_wheel_after_quiz')->default(true); // Aktivira se nakon polaganja kviza
                $table->integer('spin_wheel_cooldown_hours')->default(24); // Koliko sati između pokušaja
                
                $table->timestamps();
                
                $table->unique('course_id');
            });
        }

        // Surprise Rewards - nagrade koje mogu biti osvojene
        if (!Schema::hasTable('lms_surprise_rewards')) {
            Schema::create('lms_surprise_rewards', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                
                // Tip nagrade
                $table->enum('type', ['scratch_card', 'spin_wheel']); // Za koji tip iznenađenja
                
                // Tip nagrade
                $table->enum('reward_type', [
                    'bonus_points',      // Dodatni bodovi
                    'extra_luck',        // Više sreće
                    'second_chance',     // Drugi pit
                    'nice_gift',         // Lijep poklon
                    'wish_success',      // Želja za uspješan dan
                    'motivational_message' // Motivirajuća poruka
                ]);
                
                // Sadržaj nagrade
                $table->string('title'); // Naslov nagrade
                $table->text('description')->nullable(); // Opis nagrade
                $table->text('message')->nullable(); // Poruka koja se prikazuje
                
                // Vrijednost nagrade (za bonus_points)
                $table->integer('points_value')->nullable(); // Koliko bodova
                
                // Vjerovatnoća osvajanja (u procentima, 0-100)
                $table->decimal('probability', 5, 2)->default(10.00); // Default 10%
                
                // Redoslijed prikaza (za spin wheel)
                $table->integer('order')->default(0);
                
                // Aktivnost
                $table->boolean('is_active')->default(true);
                
                $table->timestamps();
                
                $table->index(['course_id', 'type']);
            });
        }

        // User Surprise Attempts - pokušaji korisnika
        if (!Schema::hasTable('lms_user_surprise_attempts')) {
            Schema::create('lms_user_surprise_attempts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('lms_courses')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('quiz_id')->nullable()->constrained('lms_quizzes')->nullOnDelete(); // Povezano sa kvizom ako je nakon kviza
                
                // Tip iznenađenja
                $table->enum('surprise_type', ['scratch_card', 'spin_wheel']);
                
                // Osvojena nagrada
                $table->foreignId('reward_id')->nullable()->constrained('lms_surprise_rewards')->nullOnDelete();
                
                // Status
                $table->enum('status', ['pending', 'completed', 'claimed'])->default('pending');
                
                // Dodatni podaci (JSON)
                $table->json('metadata')->nullable(); // Dodatni podaci o pokušaju
                
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                
                $table->index(['course_id', 'user_id', 'surprise_type']);
                $table->index(['user_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lms_user_surprise_attempts');
        Schema::dropIfExists('lms_surprise_rewards');
        Schema::dropIfExists('lms_course_surprises');
    }
};



