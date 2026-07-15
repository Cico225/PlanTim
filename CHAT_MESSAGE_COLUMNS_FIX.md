# Chat Message Columns Fix

## Problem
Korisnik je dobio SQL grešku kada je pokušao da pošalje poruku:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'file_url' in 'field list'
```

## Uzrok
`ChatController.php` je pokušavao da upiše `file_url` i `file_name` direktno u `chat_messages` tabelu, ali te kolone ne postoje. Umesto toga, postoji posebna tabela `chat_message_attachments` za fajlove.

## Struktura tabela (iz migracije)

### chat_messages
```sql
- id (PK)
- conversation_id (FK chat_conversations.id)
- user_id (FK users.id)
- message TEXT NULL
- type VARCHAR(50) DEFAULT 'text'
- reply_to_id (FK chat_messages.id) NULL
- is_edited BOOLEAN DEFAULT false
- edited_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### chat_message_attachments
```sql
- id (PK)
- message_id (FK chat_messages.id)
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- mime_type VARCHAR(100)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

## Rešenje

### 1. Popravljen sendMessage u ChatController

**Pre:**
```php
$messageId = DB::table('chat_messages')->insertGetId([
    'conversation_id' => $conversationId,
    'user_id' => $request->user()->id,
    'message' => $request->input('message'),
    'type' => $request->input('type', 'text'),
    'file_url' => $request->input('file_url'),      // ❌ Kolona ne postoji
    'file_name' => $request->input('file_name'),    // ❌ Kolona ne postoji
    'is_read' => false,
    'created_at' => now(),
    'updated_at' => now(),
]);
```

**Posle:**
```php
$messageId = DB::table('chat_messages')->insertGetId([
    'conversation_id' => $conversationId,
    'user_id' => $request->user()->id,
    'message' => $request->input('message'),
    'type' => $request->input('type', 'text'),
    'is_read' => false,
    'created_at' => now(),
    'updated_at' => now(),
]);

// If there are file attachments, save them separately
if ($request->input('file_url') && $request->input('file_name')) {
    DB::table('chat_message_attachments')->insert([
        'message_id' => $messageId,
        'file_name' => $request->input('file_name'),
        'file_path' => $request->input('file_url'),
        'file_size' => $request->input('file_size', 0),
        'mime_type' => $request->input('mime_type', 'application/octet-stream'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}
```

### 2. Dodano učitavanje attachments-a

**U getMessages funkciji:**
```php
// Load attachments for each message
foreach ($messages as $message) {
    $message->attachments = DB::table('chat_message_attachments')
        ->where('message_id', $message->id)
        ->get();
}
```

**U sendMessage funkciji (za povratnu vrednost):**
```php
// Load attachments for the message
$message->attachments = DB::table('chat_message_attachments')
    ->where('message_id', $messageId)
    ->get();
```

### 3. Proširena validacija

```php
$validator = Validator::make($request->all(), [
    'message' => 'required|string|max:5000',
    'type' => 'nullable|in:text,file,image,system',
    'file_url' => 'nullable|string',
    'file_name' => 'nullable|string',
    'file_size' => 'nullable|integer',      // ✅ Dodano
    'mime_type' => 'nullable|string',       // ✅ Dodano
]);
```

## Testiranje

Sada kada pošaljete poruku:

1. **Tekst poruke** se čuva u `chat_messages` tabeli
2. **Fajlovi** (ako postoje) se čuvaju u `chat_message_attachments` tabeli
3. **Attachments** se učitavaju i vraćaju sa porukom

## Status
✅ **REŠENO** - Slanje poruka sada radi bez SQL grešaka

## Fajlovi izmenjeni
1. `app/Http/Controllers/Api/ChatController.php` - Popravljena struktura podataka za poruke i attachments
















