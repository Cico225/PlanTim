<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_contacts', function (Blueprint $table) {
            // Check if 'name' column exists and 'first_name' doesn't
            if (Schema::hasColumn('crm_contacts', 'name') && !Schema::hasColumn('crm_contacts', 'first_name')) {
                // Migrate existing data: split 'name' into 'first_name' and 'last_name'
                $contacts = DB::table('crm_contacts')->whereNotNull('name')->get();
                
                // Add new columns
                $table->string('first_name')->nullable()->after('company_id');
                $table->string('last_name')->nullable()->after('first_name');
                
                // Migrate data
                foreach ($contacts as $contact) {
                    $nameParts = $this->splitName($contact->name);
                    DB::table('crm_contacts')
                        ->where('id', $contact->id)
                        ->update([
                            'first_name' => $nameParts['first'],
                            'last_name' => $nameParts['last']
                        ]);
                }
                
                // Make first_name and last_name required if we have data
                if ($contacts->count() > 0) {
                    // Change columns to NOT NULL after migration
                    DB::statement('ALTER TABLE `crm_contacts` MODIFY `first_name` VARCHAR(255) NOT NULL');
                    DB::statement('ALTER TABLE `crm_contacts` MODIFY `last_name` VARCHAR(255) NOT NULL');
                }
                
                // Drop the old 'name' column
                $table->dropColumn('name');
            } elseif (!Schema::hasColumn('crm_contacts', 'first_name')) {
                // If 'name' doesn't exist, just add the new columns
                $table->string('first_name')->after('company_id');
                $table->string('last_name')->after('first_name');
            }
            
            // Also add other missing columns if needed
            if (!Schema::hasColumn('crm_contacts', 'mobile')) {
                $table->string('mobile', 50)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('crm_contacts', 'avatar')) {
                $table->string('avatar')->nullable()->after('position');
            }
            if (!Schema::hasColumn('crm_contacts', 'address')) {
                $table->text('address')->nullable();
            }
            if (!Schema::hasColumn('crm_contacts', 'city')) {
                $table->string('city', 100)->nullable();
            }
            if (!Schema::hasColumn('crm_contacts', 'country')) {
                $table->string('country', 100)->nullable();
            }
            if (!Schema::hasColumn('crm_contacts', 'postal_code')) {
                $table->string('postal_code', 20)->nullable();
            }
            if (!Schema::hasColumn('crm_contacts', 'birthday')) {
                $table->date('birthday')->nullable();
            }
            if (!Schema::hasColumn('crm_contacts', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete()->after('notes');
            }
            if (!Schema::hasColumn('crm_contacts', 'created_by')) {
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete()->after('owner_id');
            }
            if (!Schema::hasColumn('crm_contacts', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_contacts', function (Blueprint $table) {
            // Merge first_name and last_name back to name if rolling back
            if (Schema::hasColumn('crm_contacts', 'first_name') && Schema::hasColumn('crm_contacts', 'last_name')) {
                $contacts = DB::table('crm_contacts')->get();
                
                $table->string('name')->nullable();
                
                foreach ($contacts as $contact) {
                    $fullName = trim(($contact->first_name ?? '') . ' ' . ($contact->last_name ?? ''));
                    DB::table('crm_contacts')
                        ->where('id', $contact->id)
                        ->update(['name' => $fullName ?: null]);
                }
                
                if ($contacts->count() > 0) {
                    DB::statement('ALTER TABLE `crm_contacts` MODIFY `name` VARCHAR(255) NOT NULL');
                }
                
                $table->dropColumn(['first_name', 'last_name']);
            }
        });
    }

    /**
     * Split a full name into first and last name
     */
    private function splitName(string $name): array
    {
        $name = trim($name);
        $parts = explode(' ', $name, 2);
        
        return [
            'first' => $parts[0] ?? '',
            'last' => $parts[1] ?? ''
        ];
    }
};













