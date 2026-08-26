<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('planika_finance_krediti')) {
            return;
        }

        Schema::table('planika_finance_krediti', function (Blueprint $table) {
            if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_path')) {
                $table->string('zabrana_scan_path')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_name')) {
                $table->string('zabrana_scan_name')->nullable()->after('zabrana_scan_path');
            }
            if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_mime')) {
                $table->string('zabrana_scan_mime', 128)->nullable()->after('zabrana_scan_name');
            }
            if (! Schema::hasColumn('planika_finance_krediti', 'zabrana_scan_size')) {
                $table->unsignedInteger('zabrana_scan_size')->nullable()->after('zabrana_scan_mime');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('planika_finance_krediti')) {
            return;
        }

        Schema::table('planika_finance_krediti', function (Blueprint $table) {
            foreach (['zabrana_scan_path', 'zabrana_scan_name', 'zabrana_scan_mime', 'zabrana_scan_size'] as $col) {
                if (Schema::hasColumn('planika_finance_krediti', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
