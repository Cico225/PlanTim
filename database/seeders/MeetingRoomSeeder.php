<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MeetingRoom;

class MeetingRoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        MeetingRoom::firstOrCreate(
            ['name' => 'Sala za sastanke'],
            [
                'location' => '3. sprat',
                'description' => 'Sala za sastanke na 3. spratu',
                'capacity' => 20,
                'equipment' => json_encode(['projektor', 'tabla', 'wi-fi']),
                'is_active' => true,
            ]
        );
    }
}

