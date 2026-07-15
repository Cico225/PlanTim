# Chat Message Sending Debug Fix

## Problem
Korisnik je prijavio da kada pošalje poruku, ništa se ne dešava.

## Debug sistem implementiran

### 1. Backend debug logovi

**Fajl:** `app/Http/Controllers/Api/ChatController.php`

**Dodano u `sendMessage` funkciju:**
```php
\Log::info('Sending message', [
    'conversation_id' => $conversationId,
    'user_id' => $request->user()->id,
    'request_data' => $request->all()
]);

// Na kraju funkcije
\Log::info('Message sent successfully', [
    'message_id' => $messageId,
    'conversation_id' => $conversationId
]);
```

### 2. Frontend debug logovi

**Fajl:** `frontend/src/modules/chat/pages/Chat.tsx`

**Dodano u `handleSendMessage` funkciju:**
```javascript
console.log('Sending message:', { message, type, selectedConversationId });
console.log('Sending payload:', payload);
console.log('Auth token:', token ? 'Present' : 'Missing');
console.log('Send message response status:', response.status);
console.log('New message received:', newMessage);
```

**Fajl:** `frontend/src/modules/chat/components/MessageInput.tsx`

**Dodano u `handleSubmit` funkciju:**
```javascript
console.log('MessageInput handleSubmit:', { message: message.trim(), disabled });
console.log('Calling onSendMessage with:', message.trim());
```

### 3. Popravka validacije

**Problem:** Backend je zahtevao `type` kao required polje, ali frontend ga nije uvek slao.

**Rešenje:**
```php
// Pre
'type' => 'required|in:text,file,image,system',

// Posle  
'type' => 'nullable|in:text,file,image,system',
```

## Kako testirati

1. **Otvorite Developer Tools (F12)**
2. **Idite na Console tab**
3. **Ukucajte poruku i pritisnite Enter ili kliknite Send**
4. **Pratite logove u ovom redosledu:**

### Očekivani logovi:

```javascript
// 1. MessageInput
"MessageInput handleSubmit: {message: 'test poruka', disabled: false}"
"Calling onSendMessage with: test poruka"

// 2. Chat.tsx
"Sending message: {message: 'test poruka', type: 'text', selectedConversationId: 5}"
"Sending payload: {message: 'test poruka', type: 'text'}"
"Auth token: Present"
"Send message response status: 201"
"New message received: {id: 1, message: 'test poruka', ...}"
```

### Laravel logovi (storage/logs/laravel.log):

```
[timestamp] local.INFO: Sending message {"conversation_id":5,"user_id":1,"request_data":{"message":"test poruka","type":"text"}}
[timestamp] local.INFO: Message sent successfully {"message_id":1,"conversation_id":5}
```

## Mogući uzroci problema

1. **Frontend ne poziva funkciju** - Nema logova iz MessageInput
2. **API poziv ne stiže** - Nema logova iz Chat.tsx
3. **Backend greška** - Status != 201, greška u Laravel logu
4. **Autentifikacija** - Token missing ili invalid
5. **Validacija** - Greška u validaciji podataka
6. **Database greška** - Problem sa upisom u bazu

## Trenutno stanje

- ✅ **API endpoint postoji** - `/api/chat/conversations/{id}/messages` POST
- ✅ **Route registrovan** - u `routes/api.php`
- ✅ **Konverzacije postoje** - 4 konverzacije u bazi
- ❓ **Poruke** - 0 poruka u bazi (treba testirati)

## Status
🔧 **DEBUG LOGOVI DODANI** - Sada možemo videti tačno gde se proces prekida

## Fajlovi izmenjeni
1. `app/Http/Controllers/Api/ChatController.php` - Debug logovi i popravka validacije
2. `frontend/src/modules/chat/pages/Chat.tsx` - Debug logovi
3. `frontend/src/modules/chat/components/MessageInput.tsx` - Debug logovi

## Sledeći koraci
Testirati slanje poruke i analizirati console i Laravel logove da se identifikuje tačan uzrok problema.
















