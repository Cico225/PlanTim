<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Job Positions
        Schema::create('ats_positions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('department_id')->nullable()->constrained('hrm_departments')->nullOnDelete();
            $table->string('location')->nullable();
            $table->string('employment_type')->default('full-time'); // full-time, part-time, contract, intern
            $table->enum('status', ['draft', 'open', 'closed', 'on_hold'])->default('draft');
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->date('posted_date')->nullable();
            $table->date('closing_date')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('department_id');
        });

        // Candidates
        Schema::create('ats_candidates', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->foreignId('position_id')->nullable()->constrained('ats_positions')->nullOnDelete();
            $table->enum('status', ['new', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected', 'hired'])->default('new');
            $table->string('resume_url')->nullable();
            $table->text('cover_letter')->nullable();
            $table->text('notes')->nullable();
            $table->date('applied_date')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('position_id');
            $table->index('email');
        });

        // Interviews
        Schema::create('ats_interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('ats_candidates')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('ats_positions')->cascadeOnDelete();
            $table->foreignId('interviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('interview_type', ['phone', 'video', 'in-person', 'technical'])->default('phone');
            $table->date('scheduled_date');
            $table->time('scheduled_time');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->integer('rating')->nullable(); // 1-5
            $table->text('feedback')->nullable();
            $table->timestamps();

            $table->index('candidate_id');
            $table->index('position_id');
            $table->index('status');
            $table->index('scheduled_date');
        });

        // Offers
        Schema::create('ats_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('ats_candidates')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('ats_positions')->cascadeOnDelete();
            $table->decimal('salary', 15, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->enum('status', ['pending', 'sent', 'accepted', 'rejected', 'expired'])->default('pending');
            $table->text('notes')->nullable();
            $table->string('offer_letter_url')->nullable();
            $table->date('sent_date')->nullable();
            $table->date('response_date')->nullable();
            $table->timestamps();

            $table->index('candidate_id');
            $table->index('position_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ats_offers');
        Schema::dropIfExists('ats_interviews');
        Schema::dropIfExists('ats_candidates');
        Schema::dropIfExists('ats_positions');
    }
};









