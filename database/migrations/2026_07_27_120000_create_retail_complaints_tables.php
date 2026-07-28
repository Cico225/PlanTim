<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('planika_maloprodaja_complaints')) {
            Schema::create('planika_maloprodaja_complaints', function (Blueprint $table) {
                $table->id();
                $table->string('complaint_number', 30)->unique();
                $table->foreignId('store_id')->constrained('hrm_stores')->cascadeOnDelete();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->string('customer_name');
                $table->string('customer_address')->nullable();
                $table->string('customer_phone', 50)->nullable();
                $table->string('customer_city')->nullable();
                $table->string('customer_email')->nullable();
                $table->string('article_code', 100)->nullable();
                $table->decimal('article_price', 12, 2)->nullable();
                $table->string('payment_method', 50)->nullable();
                $table->string('receipt_number', 100)->nullable();
                $table->date('purchase_date')->nullable();
                $table->text('defect_description')->nullable();
                $table->enum('status', [
                    'zaprimljena',
                    'ponovo_uslikati',
                    'odbijena',
                    'opravdana',
                ])->default('zaprimljena');
                $table->text('admin_comment')->nullable();
                $table->text('admin_response')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('photo_1_path')->nullable();
                $table->unsignedInteger('photo_1_size')->nullable();
                $table->string('photo_2_path')->nullable();
                $table->unsignedInteger('photo_2_size')->nullable();
                $table->string('photo_3_path')->nullable();
                $table->unsignedInteger('photo_3_size')->nullable();
                $table->string('photo_4_path')->nullable();
                $table->unsignedInteger('photo_4_size')->nullable();
                $table->timestamps();

                $table->index('store_id');
                $table->index('status');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('planika_maloprodaja_complaints');
    }
};
