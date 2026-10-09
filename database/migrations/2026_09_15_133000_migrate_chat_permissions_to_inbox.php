<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->moveChatToInbox('user_module_permissions', 'user_id');
        $this->moveChatToInbox('role_module_permissions', 'role_id');

        if (Schema::hasTable('system_modules')) {
            DB::table('system_modules')->where('name', 'chat')->delete();
        }
    }

    /**
     * Renames "chat" rows to "inbox". When an "inbox" row already exists for the same owner,
     * the permission flags are merged into it (unique key on owner + module_name) and the chat row is removed.
     */
    private function moveChatToInbox(string $table, string $ownerColumn): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $ownerColumn)) {
            return;
        }

        $flagColumns = array_values(array_filter(
            Schema::getColumnListing($table),
            fn ($c) => str_starts_with($c, 'can_')
        ));

        $chatRows = DB::table($table)->where('module_name', 'chat')->get();
        foreach ($chatRows as $chat) {
            $inbox = DB::table($table)
                ->where($ownerColumn, $chat->{$ownerColumn})
                ->where('module_name', 'inbox')
                ->first();

            if (!$inbox) {
                DB::table($table)->where('id', $chat->id)->update(['module_name' => 'inbox']);
                continue;
            }

            $merged = [];
            foreach ($flagColumns as $col) {
                $merged[$col] = (int) ((bool) ($inbox->{$col} ?? false) || (bool) ($chat->{$col} ?? false));
            }
            if ($merged) {
                if (Schema::hasColumn($table, 'updated_at')) {
                    $merged['updated_at'] = now();
                }
                DB::table($table)->where('id', $inbox->id)->update($merged);
            }
            DB::table($table)->where('id', $chat->id)->delete();
        }
    }

    public function down(): void
    {
        // irreversible data migration
    }
};
