<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('planika_maloprodaja_complaints')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            // Temporarily allow both old and new values
            DB::statement("ALTER TABLE planika_maloprodaja_complaints MODIFY COLUMN status ENUM('zaprimljena', 'ponovo_uslikati', 'odbijena', 'opravdana', 'odobrena') NOT NULL DEFAULT 'zaprimljena'");
        }

        DB::table('planika_maloprodaja_complaints')
            ->where('status', 'ponovo_uslikati')
            ->update(['status' => 'zaprimljena', 'updated_at' => now()]);

        DB::table('planika_maloprodaja_complaints')
            ->where('status', 'opravdana')
            ->update(['status' => 'odobrena', 'updated_at' => now()]);

        if (!Schema::hasColumn('planika_maloprodaja_complaints', 'submitted_at')) {
            Schema::table('planika_maloprodaja_complaints', function ($table) {
                $table->timestamp('submitted_at')->nullable()->after('status');
            });
        }

        DB::table('planika_maloprodaja_complaints')
            ->whereNull('submitted_at')
            ->where(function ($q) {
                $q->whereNotNull('photo_1_path')
                    ->orWhereNotNull('photo_2_path')
                    ->orWhereNotNull('photo_3_path')
                    ->orWhereNotNull('photo_4_path');
            })
            ->whereIn('status', ['zaprimljena', 'odobrena', 'odbijena'])
            ->update(['submitted_at' => DB::raw('COALESCE(updated_at, created_at)')]);

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE planika_maloprodaja_complaints MODIFY COLUMN status ENUM('zaprimljena', 'odobrena', 'odbijena') NOT NULL DEFAULT 'zaprimljena'");
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('planika_maloprodaja_complaints')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE planika_maloprodaja_complaints MODIFY COLUMN status ENUM('zaprimljena', 'ponovo_uslikati', 'odbijena', 'opravdana', 'odobrena') NOT NULL DEFAULT 'zaprimljena'");
        }

        DB::table('planika_maloprodaja_complaints')
            ->where('status', 'odobrena')
            ->update(['status' => 'opravdana', 'updated_at' => now()]);

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE planika_maloprodaja_complaints MODIFY COLUMN status ENUM('zaprimljena', 'ponovo_uslikati', 'odbijena', 'opravdana') NOT NULL DEFAULT 'zaprimljena'");
        }

        if (Schema::hasColumn('planika_maloprodaja_complaints', 'submitted_at')) {
            Schema::table('planika_maloprodaja_complaints', function ($table) {
                $table->dropColumn('submitted_at');
            });
        }
    }
};
