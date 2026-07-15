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
        // Glavna tabela za evidencije kontrola
        Schema::create('retail_control_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('hrm_stores')->onDelete('cascade');
            $table->foreignId('plan_item_id')->nullable()->constrained('retail_control_plan_items')->nullOnDelete();
            $table->string('store_code')->nullable(); // Auto-popunjeno
            $table->string('store_location')->nullable(); // Grad / lokacija (read-only)
            $table->enum('control_type', ['total_inventory', 'inspection'])->default('inspection');
            
            // Datum i vrijeme
            $table->date('control_date_from');
            $table->date('control_date_to')->nullable(); // Ako traje više dana
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            
            // Status
            $table->enum('status', ['draft', 'finalized', 'locked'])->default('draft');
            
            // Totalna inventura - sažetak
            $table->decimal('total_book_value', 15, 2)->nullable(); // Ukupna knjigovodstvena vrijednost
            $table->decimal('total_counted_value', 15, 2)->nullable(); // Ukupna popisana vrijednost
            $table->decimal('total_difference', 15, 2)->nullable(); // Razlika ukupno
            $table->enum('inventory_status', ['no_difference', 'shortage', 'surplus', 'combined'])->nullable();
            
            // Razlozi odstupanja (JSON array)
            $table->json('deviation_reasons')->nullable();
            $table->text('deviation_reason_other')->nullable();
            
            // Zaključak inventure
            $table->text('inventory_conclusion')->nullable();
            $table->boolean('corrective_measures_proposed')->default(false);
            
            // Obilazak - opšta ocjena
            $table->enum('store_rating', ['1', '2', '3', '4', '5', 'A', 'B', 'C', 'D', 'E'])->nullable();
            $table->text('store_rating_comment')->nullable();
            
            // Zapažanja
            $table->text('positive_observations')->nullable();
            $table->text('negative_observations')->nullable();
            
            $table->timestamps();
            
            $table->index('store_id');
            $table->index('control_type');
            $table->index('status');
            $table->index('control_date_from');
        });
        
        // Učesnici kontrole (osobe koje su vršile kontrolu)
        Schema::create('retail_control_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name'); // Ime i prezime
            $table->string('function'); // Funkcija (regionalni menadžer, interna kontrola, revizija)
            $table->timestamps();
            
            $table->index('control_record_id');
            $table->index('user_id');
        });
        
        // Prisutne osobe u prodavnici
        Schema::create('retail_control_present_persons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->foreignId('employee_id')->nullable()->constrained('hrm_employees')->nullOnDelete();
            $table->string('name'); // Ime i prezime (može biti ručno uneseno)
            $table->string('function'); // Funkcija (poslovođa, prodavač, zamjenik...)
            $table->timestamps();
            
            $table->index('control_record_id');
        });
        
        // Stavke inventure (za totalnu inventuru)
        Schema::create('retail_inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->string('article_name'); // Naziv artikla
            $table->string('article_code')->nullable(); // Šifra artikla
            $table->decimal('book_value', 15, 2)->default(0); // Knjigovodstveno
            $table->decimal('counted_value', 15, 2)->default(0); // Popisano
            $table->decimal('difference', 15, 2)->default(0); // Razlika (popisano - knjigovodstveno)
            $table->decimal('difference_value', 15, 2)->default(0); // Vrijednost razlike
            $table->text('notes')->nullable(); // Napomena
            $table->timestamps();
            
            $table->index('control_record_id');
        });
        
        // Operativna kontrola - checklista i zapažanja
        Schema::create('retail_control_observations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->string('category'); // Izgled prodavnice, Roba, Dokumentacija, Osoblje
            $table->string('item'); // Naziv stavke (Čistoća, Izlog uređen, itd.)
            $table->enum('status', ['ok', 'not_ok', 'n_a'])->nullable(); // OK / Nije OK / N/A
            $table->text('note')->nullable(); // Kratka napomena
            $table->timestamps();
            
            $table->index('control_record_id');
            $table->index('category');
        });
        
        // Naložene mjere
        Schema::create('retail_control_measures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->text('measure'); // Opis mjere
            $table->foreignId('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('responsible_name')->nullable(); // Može biti ručno uneseno
            $table->date('deadline')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->timestamps();
            
            $table->index('control_record_id');
            $table->index('status');
        });
        
        // Prilozi (fotografije, PDF, Excel)
        Schema::create('retail_control_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('file_type'); // image, pdf, excel
            $table->string('mime_type');
            $table->integer('file_size'); // u bajtovima
            $table->text('notes')->nullable(); // Napomena uz prilog
            $table->timestamps();
            
            $table->index('control_record_id');
        });
        
        // Digitalni potpisi
        Schema::create('retail_control_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('control_record_id')->constrained('retail_control_records')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('signature_type', ['controller', 'store_manager']); // Kontrolor ili Poslovođa
            $table->string('signature_hash')->nullable(); // Hash digitalnog potpisa
            $table->timestamp('signed_at')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
            
            $table->unique(['control_record_id', 'user_id', 'signature_type'], 'control_signatures_unique');
            $table->index('control_record_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retail_control_signatures');
        Schema::dropIfExists('retail_control_attachments');
        Schema::dropIfExists('retail_control_measures');
        Schema::dropIfExists('retail_control_observations');
        Schema::dropIfExists('retail_inventory_items');
        Schema::dropIfExists('retail_control_present_persons');
        Schema::dropIfExists('retail_control_participants');
        Schema::dropIfExists('retail_control_records');
    }
};
