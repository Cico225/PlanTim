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
        // Digitalni potpisi za evaluacije
        if (!Schema::hasTable('planika_maloprodaja_evaluation_signatures')) {
            Schema::create('planika_maloprodaja_evaluation_signatures', function (Blueprint $table) {
                $table->id();
                $table->foreignId('evaluation_id')->constrained('planika_maloprodaja_employee_evaluations')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->enum('signature_type', ['evaluator', 'employee']); // Ocjenjivač ili Zaposleni
                $table->text('signature_data')->nullable(); // Base64 encoded signature image
                $table->string('signature_hash')->nullable(); // Hash digitalnog potpisa
                $table->timestamp('signed_at')->nullable();
                $table->string('ip_address')->nullable();
                $table->timestamps();
                
                $table->unique(['evaluation_id', 'user_id', 'signature_type'], 'eval_signatures_unique');
                $table->index('evaluation_id');
                $table->index('user_id');
            });
        }

        // Dodati kolonu za status potpisivanja u evaluacije
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                if (!Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'signature_status')) {
                    $table->enum('signature_status', ['draft', 'evaluator_signed', 'employee_signed', 'completed'])->default('draft')->after('status');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_evaluation_signatures');
        
        if (Schema::hasTable('planika_maloprodaja_employee_evaluations')) {
            Schema::table('planika_maloprodaja_employee_evaluations', function (Blueprint $table) {
                if (Schema::hasColumn('planika_maloprodaja_employee_evaluations', 'signature_status')) {
                    $table->dropColumn('signature_status');
                }
            });
        }
    }
};






