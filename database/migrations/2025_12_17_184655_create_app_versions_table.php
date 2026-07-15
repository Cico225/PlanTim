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
        Schema::create('app_versions', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20)->unique(); // e.g., "1.0.0", "1.1.0", "2.0.0"
            $table->string('version_name')->nullable(); // e.g., "Initial Release", "Feature Update"
            $table->text('changelog')->nullable(); // JSON array or text
            $table->text('release_notes')->nullable();
            $table->boolean('is_active')->default(false); // Only one active version at a time
            $table->boolean('is_latest')->default(false); // Latest released version
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->index('version');
            $table->index('is_active');
            $table->index('is_latest');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_versions');
    }
};
