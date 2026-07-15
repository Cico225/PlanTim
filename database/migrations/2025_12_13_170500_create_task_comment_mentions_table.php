<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Kreira tabelu za @mentions u komentarima
     * Omogućava praćenje ko je pomenut u komentarima
     */
    public function up(): void
    {
        if (!Schema::hasTable('task_comment_mentions')) {
            Schema::create('task_comment_mentions', function (Blueprint $table) {
                $table->id();
                // Koristi unsignedBigInteger umesto foreignId jer task_comments možda ne postoji
                $table->unsignedBigInteger('comment_id');
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // Pomenuti korisnik
                $table->foreignId('mentioned_by')->nullable()->constrained('users')->nullOnDelete(); // Ko je napravio mention
                $table->timestamps();

                // Indexi
                $table->index('comment_id');
                $table->index('user_id'); // Za pronalaženje svih mentions za korisnika
                
                // Unique constraint: spreči duplikate
                $table->unique(['comment_id', 'user_id']);
            });
            
            // Dodaj foreign key constraint samo ako task_comments tabela postoji
            if (Schema::hasTable('task_comments')) {
                try {
                    Schema::table('task_comment_mentions', function (Blueprint $table) {
                        $table->foreign('comment_id')->references('id')->on('task_comments')->cascadeOnDelete();
                    });
                } catch (\Exception $e) {
                    // Foreign key već postoji ili greška, ignoriši
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_comment_mentions');
    }
};

