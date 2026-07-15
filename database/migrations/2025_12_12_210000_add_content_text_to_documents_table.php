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
        Schema::table('documents', function (Blueprint $table) {
            // Add content_text column for full-text search inside documents
            if (!Schema::hasColumn('documents', 'content_text')) {
                $table->longText('content_text')->nullable()->after('tags');
            }
            
            // Add index for full-text search if supported
            // Note: Full-text index might require specific storage engine
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'content_text')) {
                $table->dropColumn('content_text');
            }
        });
    }
};


















