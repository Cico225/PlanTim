<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Test direct database insertion
try {
    echo "Testing direct message insertion...\n";
    
    $messageId = DB::table('chat_messages')->insertGetId([
        'conversation_id' => 5,
        'user_id' => 4,
        'message' => 'Test message',
        'type' => 'text',
        'is_read' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    echo "Message inserted successfully with ID: $messageId\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
















