<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Dodaje kolone u task_comments tabelu za @mentions i edit tracking
     * POŠTUJE POSTOJEĆE - samo dodaje nove kolone sa nullable() proverom
     */
    public function up(): void
    {
        // Dodaj kolone samo ako tabela postoji
        if (Schema::hasTable('task_comments')) {
            Schema::table('task_comments', function (Blueprint $table) {
                // Mentions - JSON array user ID-jeva (backup/denormalizacija)
                if (!Schema::hasColumn('task_comments', 'mentions')) {
                    $table->json('mentions')->nullable()->after('comment'); // Array of user IDs
                }
                
                // Edit tracking
                if (!Schema::hasColumn('task_comments', 'is_edited')) {
                    $table->boolean('is_edited')->default(false)->after('mentions');
                }
                
                if (!Schema::hasColumn('task_comments', 'edited_at')) {
                    $table->timestamp('edited_at')->nullable()->after('is_edited');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     * NE BRIŠE kolone - samo dokumentuje rollback
     */
    public function down(): void
    {
        // Prema vodiču - NE BRIŠEMO kolone iz postojećih tabela
        // Ovo je samo dokumentacija rollback-a
    }
};

