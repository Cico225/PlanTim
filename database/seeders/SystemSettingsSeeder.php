<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder initializes default system settings if they don't exist.
     * It uses updateOrInsert to protect existing settings (won't overwrite existing values).
     */
    public function run(): void
    {
        $defaultSettings = [
            // General Settings
            [
                'key' => 'app_name',
                'value' => 'PlanTim',
                'type' => 'string',
                'description' => 'Naziv aplikacije',
                'group' => 'general',
            ],
            [
                'key' => 'app_url',
                'value' => 'http://localhost:5173',
                'type' => 'string',
                'description' => 'URL aplikacije',
                'group' => 'general',
            ],
            [
                'key' => 'timezone',
                'value' => 'Europe/Sarajevo',
                'type' => 'string',
                'description' => 'Vremenska zona',
                'group' => 'general',
            ],
            [
                'key' => 'locale',
                'value' => 'bs',
                'type' => 'string',
                'description' => 'Podrazumevani jezik',
                'group' => 'general',
            ],
            [
                'key' => 'date_format',
                'value' => 'd.m.Y',
                'type' => 'string',
                'description' => 'Format datuma',
                'group' => 'general',
            ],
            [
                'key' => 'time_format',
                'value' => 'H:i',
                'type' => 'string',
                'description' => 'Format vremena',
                'group' => 'general',
            ],
            
            // Email Settings
            [
                'key' => 'mail_from_address',
                'value' => 'noreply@plantim.local',
                'type' => 'string',
                'description' => 'Email adresa pošiljatelja',
                'group' => 'email',
            ],
            [
                'key' => 'mail_from_name',
                'value' => 'PlanTim',
                'type' => 'string',
                'description' => 'Ime pošiljatelja',
                'group' => 'email',
            ],
            [
                'key' => 'mail_driver',
                'value' => 'smtp',
                'type' => 'string',
                'description' => 'Email driver',
                'group' => 'email',
            ],
            [
                'key' => 'mail_host',
                'value' => 'smtp.mailtrap.io',
                'type' => 'string',
                'description' => 'SMTP server',
                'group' => 'email',
            ],
            [
                'key' => 'mail_port',
                'value' => '2525',
                'type' => 'integer',
                'description' => 'SMTP port',
                'group' => 'email',
            ],
            [
                'key' => 'mail_username',
                'value' => '',
                'type' => 'string',
                'description' => 'SMTP korisničko ime',
                'group' => 'email',
            ],
            [
                'key' => 'mail_password',
                'value' => '',
                'type' => 'string',
                'description' => 'SMTP lozinka',
                'group' => 'email',
            ],
            [
                'key' => 'mail_encryption',
                'value' => 'tls',
                'type' => 'string',
                'description' => 'SMTP enkripcija',
                'group' => 'email',
            ],
            
            // Security Settings
            [
                'key' => 'password_min_length',
                'value' => '8',
                'type' => 'integer',
                'description' => 'Minimalna dužina lozinke',
                'group' => 'security',
            ],
            [
                'key' => 'password_require_uppercase',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Zahtevaj velika slova',
                'group' => 'security',
            ],
            [
                'key' => 'password_require_lowercase',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Zahtevaj mala slova',
                'group' => 'security',
            ],
            [
                'key' => 'password_require_numbers',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Zahtevaj brojeve',
                'group' => 'security',
            ],
            [
                'key' => 'password_require_symbols',
                'value' => 'false',
                'type' => 'boolean',
                'description' => 'Zahtevaj simbole',
                'group' => 'security',
            ],
            [
                'key' => 'session_lifetime',
                'value' => '120',
                'type' => 'integer',
                'description' => 'Trajanje sesije (minuti)',
                'group' => 'security',
            ],
            [
                'key' => 'max_login_attempts',
                'value' => '5',
                'type' => 'integer',
                'description' => 'Maksimalan broj pokušaja prijave',
                'group' => 'security',
            ],
            [
                'key' => 'lockout_duration',
                'value' => '15',
                'type' => 'integer',
                'description' => 'Trajanje blokade (minuti)',
                'group' => 'security',
            ],
            
            // Appearance Settings
            [
                'key' => 'default_theme',
                'value' => 'light',
                'type' => 'string',
                'description' => 'Podrazumevana tema',
                'group' => 'appearance',
            ],
            [
                'key' => 'logo_url',
                'value' => '',
                'type' => 'string',
                'description' => 'URL loga',
                'group' => 'appearance',
            ],
            [
                'key' => 'favicon_url',
                'value' => '',
                'type' => 'string',
                'description' => 'URL favicona',
                'group' => 'appearance',
            ],
            [
                'key' => 'primary_color',
                'value' => '#3B82F6',
                'type' => 'string',
                'description' => 'Primarna boja',
                'group' => 'appearance',
            ],
            
            // Notification Settings
            [
                'key' => 'notifications_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Omogući notifikacije',
                'group' => 'notifications',
            ],
            [
                'key' => 'email_notifications_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Email notifikacije',
                'group' => 'notifications',
            ],
            [
                'key' => 'push_notifications_enabled',
                'value' => 'false',
                'type' => 'boolean',
                'description' => 'Push notifikacije',
                'group' => 'notifications',
            ],
            [
                'key' => 'notification_sound_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Zvuk notifikacija',
                'group' => 'notifications',
            ],
        ];

        // Insert default settings only if they don't exist (protection of existing data)
        foreach ($defaultSettings as $setting) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'description' => $setting['description'],
                    'group' => $setting['group'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Default system settings initialized successfully!');
        $this->command->info('Existing settings were preserved (not overwritten).');
    }
}















