<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Dodaje kolone batch_uuid i event u activity_log tabelu
     * uz poštivanje zaštite postojećeg koda - proverava da li kolone već postoje
     */
    public function up(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            // Dodaj batch_uuid kolonu samo ako ne postoji
            if (!Schema::hasColumn('activity_log', 'batch_uuid')) {
                $table->uuid('batch_uuid')->nullable()->after('properties');
            }
            
            // Dodaj event kolonu samo ako ne postoji
            if (!Schema::hasColumn('activity_log', 'event')) {
                $table->string('event')->nullable()->after('batch_uuid');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            // Ukloni kolone samo ako postoje
            if (Schema::hasColumn('activity_log', 'event')) {
                $table->dropColumn('event');
            }
            
            if (Schema::hasColumn('activity_log', 'batch_uuid')) {
                $table->dropColumn('batch_uuid');
            }
        });
    }
};





