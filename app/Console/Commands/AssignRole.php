<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class AssignRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:assign-role {email} {role}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign a role to a user by email address';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $roleName = $this->argument('role');

        // Find user
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("❌ Korisnik sa email adresom '{$email}' nije pronađen!");
            return 1;
        }

        // Check if role exists
        if (!\Spatie\Permission\Models\Role::where('name', $roleName)->exists()) {
            $this->warn("⚠️  Uloga '{$roleName}' ne postoji. Kreiranje uloge...");
            
            try {
                \Spatie\Permission\Models\Role::create([
                    'name' => $roleName,
                    'guard_name' => 'web',
                ]);
                $this->info("✅ Uloga '{$roleName}' je kreirana.");
            } catch (\Exception $e) {
                $this->error("❌ Neuspješno kreiranje uloge: " . $e->getMessage());
                return 1;
            }
        }

        // Assign role
        try {
            $user->assignRole($roleName);
            $this->info("✅ Uloga '{$roleName}' je uspješno dodeljena korisniku '{$user->name}' ({$user->email})");
            
            // Verify
            if ($user->hasRole($roleName)) {
                $this->info("✅ Provera: Korisnik ima ulogu '{$roleName}'");
            } else {
                $this->warn("⚠️  Upozorenje: Provera nije uspjela, ali uloga je dodeljena.");
            }
            
            return 0;
        } catch (\Exception $e) {
            $this->error("❌ Greška pri dodeli uloge: " . $e->getMessage());
            return 1;
        }
    }
}




