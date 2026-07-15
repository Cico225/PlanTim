<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // PLANIKA Departments
        Schema::create('planika_departments', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50);
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('type');
        });

        // PLANIKA Commercial
        Schema::create('planika_commercial', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('planika_departments')->cascadeOnDelete();
            $table->string('title');
            $table->foreignId('client_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $table->decimal('value', 15, 2);
            $table->string('currency', 10)->default('BAM');
            $table->string('status', 50);
            $table->json('data')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('status');
        });

        // PLANIKA Finance
        Schema::create('planika_finance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('planika_departments')->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('reference_number', 100)->unique();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 10)->default('BAM');
            $table->date('date');
            $table->text('description')->nullable();
            $table->json('data')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('type');
            $table->index('date');
        });

        // PLANIKA Retail
        Schema::create('planika_retail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('planika_departments')->cascadeOnDelete();
            $table->string('pos_id', 100);
            $table->string('transaction_type', 50);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 10)->default('BAM');
            $table->json('items')->nullable();
            $table->timestamp('transaction_date');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('pos_id');
            $table->index('transaction_date');
        });

        // PLANIKA Marketing
        Schema::create('planika_marketing', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('planika_departments')->cascadeOnDelete();
            $table->string('campaign_name');
            $table->string('type', 50);
            $table->decimal('budget', 15, 2)->nullable();
            $table->string('currency', 10)->default('BAM');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->json('metrics')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('type');
        });

        // PLANIKA Club Members
        Schema::create('planika_club_members', function (Blueprint $table) {
            $table->id();
            $table->string('member_number', 100)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone', 50);
            $table->integer('points')->default(0);
            $table->string('tier', 50)->default('basic');
            $table->timestamp('joined_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('member_number');
            $table->index('email');
        });

        // PLANIKA Club Transactions
        Schema::create('planika_club_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('planika_club_members')->cascadeOnDelete();
            $table->string('type', 50);
            $table->integer('points');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_club_transactions');
        Schema::dropIfExists('planika_club_members');
        Schema::dropIfExists('planika_marketing');
        Schema::dropIfExists('planika_retail');
        Schema::dropIfExists('planika_finance');
        Schema::dropIfExists('planika_commercial');
        Schema::dropIfExists('planika_departments');
    }
};

