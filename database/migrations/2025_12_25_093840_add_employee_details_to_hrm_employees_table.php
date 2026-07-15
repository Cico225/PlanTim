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
        Schema::table('hrm_employees', function (Blueprint $table) {
            // Polja iz tabele - koristimo employee_id umjesto employee_number
            if (!Schema::hasColumn('hrm_employees', 'municipality_code')) {
                $table->string('municipality_code', 20)->nullable()->after('employee_id'); // Opcina
            }
            if (!Schema::hasColumn('hrm_employees', 'gender')) {
                $table->enum('gender', ['M', 'F'])->nullable()->after('position'); // Pol
            }
            if (!Schema::hasColumn('hrm_employees', 'job_title')) {
                $table->string('job_title', 255)->nullable()->after('position'); // Naziv radnog mjesta
            }
            if (!Schema::hasColumn('hrm_employees', 'store')) {
                $table->string('store', 255)->nullable()->after('job_title'); // Prodavnica
            }
            // mobile_phone koristimo postojeće 'phone' polje, ali dodajemo mobile_phone ako ne postoji
            if (!Schema::hasColumn('hrm_employees', 'mobile_phone')) {
                $table->string('mobile_phone', 50)->nullable()->after('phone'); // Mobilni telefon
            }
            // private_address koristimo postojeće 'address' polje, ali dodajemo private_address ako ne postoji
            if (!Schema::hasColumn('hrm_employees', 'private_address')) {
                $table->text('private_address')->nullable()->after('address'); // Ulica - privatno
            }
            if (!Schema::hasColumn('hrm_employees', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('private_address'); // Datum rođenja
            }
            if (!Schema::hasColumn('hrm_employees', 'marital_status')) {
                $table->enum('marital_status', ['S', 'M', 'D', 'W'])->nullable()->after('date_of_birth'); // Bračno stanje
            }
            if (!Schema::hasColumn('hrm_employees', 'children_count')) {
                $table->integer('children_count')->default(0)->after('marital_status'); // Broj dece
            }
            // photo koristimo postojeće 'avatar' polje, ali dodajemo photo ako ne postoji
            if (!Schema::hasColumn('hrm_employees', 'photo')) {
                $table->string('photo', 255)->nullable()->after('avatar'); // Slika (path)
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hrm_employees', function (Blueprint $table) {
            $table->dropColumn([
                'municipality_code',
                'gender',
                'job_title',
                'store',
                'mobile_phone',
                'private_address',
                'date_of_birth',
                'marital_status',
                'children_count',
                'photo',
            ]);
        });
    }
};
