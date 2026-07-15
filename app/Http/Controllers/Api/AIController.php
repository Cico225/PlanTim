<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class AIController extends Controller
{
    /** Dopušteni modeli za Google Gemini generateContent (AI Studio). */
    private const GEMINI_CHAT_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    /** Stari nazivi / GPT id-evi iz zahtjeva ili baze mapiraju se na Gemini. */
    private const LEGACY_MODEL_ALIASES = [
        'gpt-4' => 'gemini-1.5-flash',
        'gpt-4o' => 'gemini-1.5-flash',
        'gpt-4o-mini' => 'gemini-1.5-flash',
        'gpt-4-turbo' => 'gemini-1.5-pro',
        'gpt-3.5-turbo' => 'gemini-1.5-flash',
    ];

    /**
     * Get AI chat history
     */
    public function getChatHistory(Request $request)
    {
        $chats = DB::table('ai_chats')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($chats);
    }

    /**
     * Get chat messages
     */
    public function getChatMessages($chatId, Request $request)
    {
        $chat = DB::table('ai_chats')
            ->where('id', $chatId)
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$chat) {
            return response()->json(['message' => 'Chat nije pronađen ili vam ne pripada.'], 404);
        }

        $messages = DB::table('ai_chat_messages')
            ->where('chat_id', $chatId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    /**
     * Send message to AI
     */
    public function sendMessage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'chat_id' => 'nullable|exists:ai_chats,id',
            'message' => 'required|string|max:5000',
            'model' => 'nullable|string|in:'.implode(',', array_merge(
                self::GEMINI_CHAT_MODELS,
                array_keys(self::LEGACY_MODEL_ALIASES),
                ['internal']
            )),
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = $request->user()->id;
        $chatId = $request->input('chat_id');
        $model = $this->resolveChatModel($request->input('model'));

        if ($chatId) {
            $existingChat = DB::table('ai_chats')
                ->where('id', $chatId)
                ->where('user_id', $userId)
                ->first();
            if (!$existingChat) {
                return response()->json(['message' => 'Chat nije pronađen ili vam ne pripada.'], 404);
            }
        }

        // Create new chat if not provided
        if (!$chatId) {
            $chatId = DB::table('ai_chats')->insertGetId([
                'user_id' => $userId,
                'title' => substr($request->input('message'), 0, 50),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Save user message
        $userMessageId = DB::table('ai_chat_messages')->insertGetId([
            'chat_id' => $chatId,
            'role' => 'user',
            'content' => $request->input('message'),
            'created_at' => now(),
        ]);

        // Get AI response
        try {
            $aiResponse = $this->getAIResponseForChat(
                (int) $chatId,
                $model,
                trim((string) $request->input('message'))
            );

            // Save AI message
            $aiMessageId = DB::table('ai_chat_messages')->insertGetId([
                'chat_id' => $chatId,
                'role' => 'assistant',
                'content' => $aiResponse,
                'created_at' => now(),
            ]);

            return response()->json([
                'chat_id' => $chatId,
                'user_message' => DB::table('ai_chat_messages')->find($userMessageId),
                'ai_message' => DB::table('ai_chat_messages')->find($aiMessageId),
            ]);
        } catch (\Exception $e) {
            $err = $e->getMessage();
            $hint = $this->geminiErrorUserHint(
                str_contains(strtolower($err), '429') ? 429 : 0,
                $err
            );

            return response()->json(array_filter([
                'message' => 'Error communicating with AI service',
                'error' => $err,
                'hint' => $hint,
            ]), 500);
        }
    }

    /**
     * Generate document using AI
     */
    public function generateDocument(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'template_type' => 'required|string',
            'input_data' => 'required|array',
            'model' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $prompt = $this->buildDocumentPrompt(
                $request->input('template_type'),
                $request->input('input_data')
            );

            $generatedContent = $this->getAIResponse(
                $prompt,
                $request->input('model', 'gemini-1.5-flash'),
                'You are a professional business document writer. Produce clear, well-structured text for the requested document type. Match the language of the provided fields when appropriate.'
            );

            // Save to database
            $documentId = DB::table('ai_document_generations')->insertGetId([
                'user_id' => $request->user()->id,
                'template_type' => $request->input('template_type'),
                'input_data' => json_encode($request->input('input_data')),
                'generated_content' => $generatedContent,
                'created_at' => now(),
            ]);

            return response()->json([
                'document' => DB::table('ai_document_generations')->find($documentId),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Semantic search
     */
    public function semanticSearch(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|max:500',
            'search_in' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // TODO: Implement semantic search using embeddings
        // This is a placeholder

        return response()->json([
            'message' => 'Semantic search - coming soon',
            'query' => $request->input('query'),
        ]);
    }

    /**
     * Google Gemini API ključ: prvo baza (admin), zatim config/.env (radi i uz config:cache).
     */
    private function resolveGeminiApiKey(): ?string
    {
        $row = DB::table('system_settings')
            ->where('key', 'gemini_api_key')
            ->where('group', 'ai')
            ->first();

        if ($row && trim((string) $row->value) !== '') {
            return trim((string) $row->value);
        }

        $fromConfig = config('services.gemini.api_key');
        if (is_string($fromConfig) && trim($fromConfig) !== '') {
            return trim($fromConfig);
        }

        return null;
    }

    /**
     * Normalizacija ID-a modela: Gemini nazivi ili stari GPT aliasi iz zahtjeva/baze.
     */
    private function normalizeGeminiModelId(string $model): string
    {
        $m = trim($model);
        if ($m === '') {
            return '';
        }
        if (isset(self::LEGACY_MODEL_ALIASES[$m])) {
            return self::LEGACY_MODEL_ALIASES[$m];
        }
        if (in_array($m, self::GEMINI_CHAT_MODELS, true)) {
            return $m;
        }

        return '';
    }

    /**
     * Kratka uputa na bosanskom za česte Gemini / Google AI greške.
     */
    private function geminiErrorUserHint(int $httpStatus, string $detail): ?string
    {
        $d = strtolower($detail);
        if ($httpStatus === 429
            || str_contains($d, 'quota')
            || str_contains($d, 'rate limit')
            || str_contains($d, 'resource_exhausted')) {
            if (str_contains($d, 'free_tier') || str_contains($d, 'free tier')) {
                $limitZero = str_contains($d, 'limit: 0');
                $zeroNote = $limitZero
                    ? ' Ako piše „limit: 0”, Google često nema dodijeljen besplatni kapacitet za taj model na ovom ključu/projektu: u Google Cloud Console za isti projekat uključite „Generative Language API”, provjerite da API ključ pripada tom projektu, ili u AI konfiguraciji prebacite model na gemini-1.5-flash. '
                    : '';

                return 'Napomena: Besplatni (free tier) Gemini limit za ovaj model — niste nužno „potrošili” puno, nego nalog možda nema kvotu za odabrani model ili je trenutno nedostupna. '
                    .'Sačekajte vrijeme iz „Please retry in …”, u administraciji postavite podrazumijevani model na gemini-1.5-flash, ili uključite naplatu za Gemini u Google Cloud. '
                    .$zeroNote
                    .'Limiti: https://ai.google.dev/gemini-api/docs/rate-limits — AI Studio: https://aistudio.google.com/';
            }

            return 'Napomena: Dosegnut je limit zahtjeva ili nema dostupnog kredita za Gemini API. '
                .'Vidi limite: https://ai.google.dev/gemini-api/docs/rate-limits — AI Studio / naplata: https://aistudio.google.com/';
        }
        if ($httpStatus === 401 || $httpStatus === 403
            || str_contains($d, 'api_key_invalid')
            || str_contains($d, 'invalid api key')
            || str_contains($d, 'api key not valid')
            || str_contains($d, 'permission denied')) {
            return 'Napomena: API ključ za Gemini je nevažeći ili nema dozvole. Kreirajte ključ u Google AI Studio: https://aistudio.google.com/app/apikey';
        }
        if ($httpStatus === 404 || (str_contains($d, 'model') && (str_contains($d, 'not found') || str_contains($d, 'not supported')))) {
            return 'Napomena: Model nije dostupan — u administraciji izaberite npr. gemini-2.0-flash ili gemini-1.5-flash.';
        }

        return null;
    }

    /**
     * Podrazumijevani ili traženi chat model (Google Gemini).
     */
    private function resolveChatModel(?string $requested): string
    {
        if ($requested === 'internal') {
            return 'internal';
        }

        $requestedNorm = '';
        if (is_string($requested) && $requested !== '') {
            $requestedNorm = $this->normalizeGeminiModelId(trim($requested));
        }

        $fromDb = DB::table('system_settings')
            ->where('key', 'default_model')
            ->where('group', 'ai')
            ->value('value');
        $fallback = $this->normalizeGeminiModelId(trim((string) ($fromDb ?: '')));

        if ($fallback === '' || ! in_array($fallback, self::GEMINI_CHAT_MODELS, true)) {
            $fallback = trim((string) config('services.gemini.chat_model', 'gemini-1.5-flash'));
        }
        if ($fallback === '' || ! in_array($fallback, self::GEMINI_CHAT_MODELS, true)) {
            $fallback = 'gemini-1.5-flash';
        }

        if ($requestedNorm !== '' && in_array($requestedNorm, self::GEMINI_CHAT_MODELS, true)) {
            return $requestedNorm;
        }

        return $fallback;
    }

    /**
     * Planika organizacijski prompt iz resources/prompts/edel_planika_organization.txt (nije ograničen admin textboxom).
     */
    private function loadPlanikaOrganizationPrompt(): string
    {
        $path = resource_path('prompts/edel_planika_organization.txt');
        if (! is_readable($path)) {
            return '';
        }
        $raw = file_get_contents($path);

        return $raw !== false ? trim($raw) : '';
    }

    /**
     * Edel system prompt: identity + PlanTim context + Planika (datoteka) + opcionalno kratke admin dopune u bazi.
     */
    private function getEdelSystemPrompt(): string
    {
        $base = <<<'PROMPT'
Ti si Edel, prijateljski AI pomoćnik u aplikaciji PlanTim (enterprise collaboration). Kratica: Enterprise Digital Enhanced Learning.
Odgovaraj jasno i kratko na jednostavna pitanja; na složenija daj strukturisane korake. Prati kontekst razgovora i upućuj se na prethodna pitanja korisnika kad ima smisla.
Ako ne znaš tačan odgovor iz proizvoda ili podataka korisnika, priznaj to i predloži gdje u aplikaciji to mogu pronaći (npr. modul) umjesto izmišljanja.

PlanTim uključuje između ostalog: Dashboard, CRM, Projekti i zadaci, DMS (dokumenti), LMS (obuka), Inbox (interne poruke), obavještenja, HRM, administracija i moduli po potrebi (uključujući Planika / maloprodaja gdje je uključeno).
Odgovaraj na bosanskom/hrvatskom/serpskom ako korisnik piše na tom jeziku; inače na jeziku korisnikove poruke.

PROMPT;

        $planika = $this->loadPlanikaOrganizationPrompt();
        $organizationBlock = $planika !== ''
            ? "\n\n--- Planika — organizacijski kontekst (resources/prompts/edel_planika_organization.txt) ---\n".$planika
            : '';

        $row = DB::table('system_settings')
            ->where('key', 'system_prompt')
            ->where('group', 'ai')
            ->first();
        $extra = $row && strlen(trim((string) $row->value)) > 0
            ? "\n\n--- Kratke dodatne upute iz administracije (baza) ---\n".trim((string) $row->value)
            : '';

        return $base.$organizationBlock.$extra;
    }

    /**
     * Full chat history for this chat (user + assistant), capped for context window costs.
     *
     * @return array<int, array{role: string, content: string}>
     */
    private function buildOpenAIHistoryMessages(int $chatId): array
    {
        $rows = DB::table('ai_chat_messages')
            ->where('chat_id', $chatId)
            ->whereIn('role', ['user', 'assistant'])
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get(['role', 'content']);

        $max = 48;
        if ($rows->count() > $max) {
            $rows = $rows->slice(-$max)->values();
        }

        $out = [];
        foreach ($rows as $row) {
            $content = trim((string) $row->content);
            if ($content === '') {
                continue;
            }
            $out[] = [
                'role' => $row->role === 'assistant' ? 'assistant' : 'user',
                'content' => $content,
            ];
        }

        return $out;
    }

    /**
     * Kratki, lokalni odgovori kada Gemini nije dostupan ili za vrlo jednostavne poruke (bez API poziva).
     */
    private function offlineEdelReply(string $text): ?string
    {
        $t = mb_strtolower(trim($text), 'UTF-8');
        $t = preg_replace('/\s+/u', ' ', $t) ?? $t;

        if (preg_match('/\b(hvala|fala|hvala\s+ti|thanks|thank\s+you)\b/u', $t)) {
            return 'Nema na čemu! Tu sam za sve oko PlanTim-a i Planike.';
        }

        $howPatterns = ['kako si', 'kako si ti', 'kako ste', 'kako ste vi', 'šta ima', 'sta ima', 'how are you'];
        foreach ($howPatterns as $p) {
            if (str_contains($t, $p)) {
                return 'Odlično sam, hvala na pitanju! Tu sam da ti olakšam rad u PlanTim-u — pitaj slobodno šta treba.';
            }
        }

        $hi = ['zdravo', 'ćao', 'cao', 'lijep pozdrav', 'dobro jutro', 'dobar dan', 'dobro veče', 'dobro vece', 'hello', 'hi', 'hey', 'hej', 'pozdrav'];
        foreach ($hi as $p) {
            if ($t === $p
                || str_starts_with($t, $p.' ')
                || str_starts_with($t, $p.',')
                || str_ends_with($t, ' '.$p)) {
                return 'Zdravo! Drago mi je — kako mogu da pomognem oko PlanTim-a danas?';
            }
        }

        if (mb_strlen($t) <= 16 && preg_match('/^(ćao|cao|bok|hey|hi)$/u', $t)) {
            return 'Zdravo! Šta te zanima u PlanTim-u?';
        }

        return null;
    }

    /**
     * Odgovor kada nema Gemini API ključa: jednostavne poruke lokalno, ostalo jasna poruka administratoru.
     */
    private function edelReplyWithoutGemini(string $latestUserMessage): string
    {
        $local = $this->offlineEdelReply($latestUserMessage);
        if ($local !== null) {
            return $local;
        }

        return 'Trenutno nije podešen Google Gemini API ključ na serveru, pa ne mogu generisati pun AI odgovor. '
            .'Pitaj administratora da u datoteci `.env` postavi `GEMINI_API_KEY=...` ili da unese ključ u Administracija → AI konfiguracija. '
            .'Do tada mogu kratko odgovoriti na pozdrave i vrlo jednostavna pitanja.';
    }

    /**
     * Send chat with conversation memory (all messages in this chat).
     */
    private function getAIResponseForChat(int $chatId, string $model, string $latestUserMessage): string
    {
        $history = $this->buildOpenAIHistoryMessages($chatId);
        $messages = array_merge(
            [['role' => 'system', 'content' => $this->getEdelSystemPrompt()]],
            $history
        );

        $apiKey = $this->resolveGeminiApiKey();
        if (! $apiKey || $model === 'internal') {
            return $this->edelReplyWithoutGemini($latestUserMessage);
        }

        try {
            return $this->getAIResponseFromMessages($messages, $model);
        } catch (\Exception $e) {
            $offline = $this->offlineEdelReply($latestUserMessage);
            if ($offline !== null) {
                return $offline;
            }
            throw $e;
        }
    }

    /**
     * Single-turn or custom-system call (npr. generisanje dokumenata).
     */
    private function getAIResponse(string $userMessage, string $model = 'gemini-1.5-flash', ?string $systemOverride = null): string
    {
        $system = $systemOverride ?? $this->getEdelSystemPrompt();

        return $this->getAIResponseFromMessages([
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $userMessage],
        ], $model);
    }

    /**
     * @param array<int, array{role: string, content: string}> $messages
     */
    private function getAIResponseFromMessages(array $messages, string $model = 'gemini-1.5-flash'): string
    {
        if ($model === 'internal') {
            return 'Internal AI response (not yet implemented)';
        }

        $model = $this->normalizeGeminiModelId($model);
        if ($model === '' || ! in_array($model, self::GEMINI_CHAT_MODELS, true)) {
            $model = (string) config('services.gemini.chat_model', 'gemini-1.5-flash');
        }
        if (! in_array($model, self::GEMINI_CHAT_MODELS, true)) {
            $model = 'gemini-1.5-flash';
        }

        $apiKey = $this->resolveGeminiApiKey();
        if (! $apiKey) {
            throw new \Exception('Gemini API key not configured');
        }

        $systemParts = [];
        $contents = [];
        foreach ($messages as $m) {
            $role = $m['role'] ?? '';
            $content = trim((string) ($m['content'] ?? ''));
            if ($content === '') {
                continue;
            }
            if ($role === 'system') {
                $systemParts[] = $content;

                continue;
            }
            $geminiRole = $role === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $geminiRole,
                'parts' => [['text' => $content]],
            ];
        }

        $body = [
            'contents' => $contents,
            'generationConfig' => [
                'maxOutputTokens' => 1024,
            ],
        ];
        if ($systemParts !== []) {
            $body['systemInstruction'] = [
                'parts' => [['text' => implode("\n\n", $systemParts)]],
            ];
        }

        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($model)
        );

        $response = Http::timeout(90)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($url.'?key='.rawurlencode($apiKey), $body);

        if ($response->successful()) {
            $json = $response->json();
            $text = $this->extractGeminiResponseText(is_array($json) ? $json : null);
            if ($text !== null && $text !== '') {
                return $text;
            }
            $block = is_array($json) && isset($json['promptFeedback']['blockReason'])
                ? (string) $json['promptFeedback']['blockReason']
                : 'empty or blocked response';
            throw new \Exception('Gemini: '.$block);
        }

        $parsed = $response->json();
        $msg = 'HTTP '.$response->status();
        if (is_array($parsed) && isset($parsed['error']['message'])) {
            $msg = (string) $parsed['error']['message'];
        } elseif (is_string($response->body()) && $response->body() !== '') {
            $msg = Str::limit($response->body(), 500);
        }
        throw new \Exception('Gemini: '.$msg);
    }

    private function extractGeminiResponseText(?array $json): ?string
    {
        if ($json === null) {
            return null;
        }
        $candidates = $json['candidates'] ?? null;
        if (! is_array($candidates) || $candidates === []) {
            return null;
        }
        $first = $candidates[0];
        if (! is_array($first)) {
            return null;
        }
        $parts = $first['content']['parts'] ?? null;
        if (! is_array($parts)) {
            return null;
        }
        $out = '';
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text'])) {
                $out .= (string) $part['text'];
            }
        }

        return $out === '' ? null : $out;
    }

    /**
     * Build document generation prompt
     */
    private function buildDocumentPrompt($templateType, $inputData)
    {
        $prompt = "Generate a professional {$templateType} document with the following information:\n\n";

        foreach ($inputData as $key => $value) {
            $prompt .= ucfirst($key) . ": " . $value . "\n";
        }

        $prompt .= "\nFormat the document professionally with appropriate sections and formatting.";

        return $prompt;
    }

    // ==================== ADMIN METHODS ====================

    /**
     * Get AI configuration settings (Admin only)
     */
    public function getAIConfig(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get AI settings from system_settings
        $settings = DB::table('system_settings')
            ->where('group', 'ai')
            ->get()
            ->mapWithKeys(function ($setting) {
                $value = $setting->value;
                if ($setting->type === 'boolean') {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                } elseif ($setting->type === 'integer') {
                    $value = (int) $value;
                } elseif ($setting->type === 'json') {
                    $value = json_decode($value, true);
                }
                return [$setting->key => [
                    'value' => $value,
                    'type' => $setting->type,
                    'description' => $setting->description,
                ]];
            });

        if ($settings->has('default_model')) {
            $entry = $settings->get('default_model');
            if (is_array($entry)) {
                $norm = $this->normalizeGeminiModelId((string) ($entry['value'] ?? ''));
                if ($norm !== '' && in_array($norm, self::GEMINI_CHAT_MODELS, true)) {
                    $entry['value'] = $norm;
                    $settings->put('default_model', $entry);
                }
            }
        }

        // Get AI statistics
        $stats = [
            'total_chats' => Schema::hasTable('ai_chats') ? DB::table('ai_chats')->count() : 0,
            'total_messages' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')->count() : 0,
            'total_documents' => Schema::hasTable('ai_document_generations') ? DB::table('ai_document_generations')->count() : 0,
            'active_users' => Schema::hasTable('ai_chats') ? DB::table('ai_chats')
                ->distinct('user_id')
                ->count('user_id') : 0,
            'messages_today' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')
                ->whereDate('created_at', today())
                ->count() : 0,
            'messages_this_week' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count() : 0,
        ];

        // Get available models
        $availableModels = [
            'gemini-1.5-flash' => 'Gemini 1.5 Flash (preporučeno za besplatni tier)',
            'gemini-2.0-flash' => 'Gemini 2.0 Flash',
            'gemini-1.5-pro' => 'Gemini 1.5 Pro',
            'internal' => 'Interni model (uskoro)',
        ];

        $orgPath = resource_path('prompts/edel_planika_organization.txt');
        $orgContent = $this->loadPlanikaOrganizationPrompt();

        return response()->json([
            'settings' => $settings,
            'stats' => $stats,
            'available_models' => $availableModels,
            'api_key_configured' => ! empty($this->resolveGeminiApiKey()),
            'organization_prompt' => [
                'content' => $orgContent !== '' ? $orgContent : null,
                'relative_path' => 'resources/prompts/edel_planika_organization.txt',
                'file_readable' => is_readable($orgPath),
            ],
        ]);
    }

    /**
     * Update AI configuration settings (Admin only)
     */
    public function updateAIConfig(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $allowedModels = implode(',', array_merge(
            self::GEMINI_CHAT_MODELS,
            array_keys(self::LEGACY_MODEL_ALIASES),
            ['internal']
        ));

        $validator = Validator::make($request->all(), [
            'gemini_api_key' => 'nullable|string',
            'default_model' => 'nullable|string|in:'.$allowedModels,
            'max_tokens' => 'nullable|integer|min:100|max:4000',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'ai_enabled' => 'nullable|boolean',
            'ai_chat_enabled' => 'nullable|boolean',
            'document_generation_enabled' => 'nullable|boolean',
            'semantic_search_enabled' => 'nullable|boolean',
            'rate_limit_per_user' => 'nullable|integer|min:1|max:1000',
            'rate_limit_per_hour' => 'nullable|integer|min:1|max:10000',
            'system_prompt' => 'nullable|string|max:8000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $settings = $request->all();

        // Map of settings to their types
        $settingTypes = [
            'gemini_api_key' => 'string',
            'default_model' => 'string',
            'max_tokens' => 'integer',
            'temperature' => 'string',
            'ai_enabled' => 'boolean',
            'ai_chat_enabled' => 'boolean',
            'document_generation_enabled' => 'boolean',
            'semantic_search_enabled' => 'boolean',
            'rate_limit_per_user' => 'integer',
            'rate_limit_per_hour' => 'integer',
            'system_prompt' => 'string',
        ];

        $descriptions = [
            'gemini_api_key' => 'Google Gemini API ključ (AI Studio, ne prikazuje se u interfejsu)',
            'default_model' => 'Podrazumevani AI model',
            'max_tokens' => 'Maksimalan broj tokena po odgovoru',
            'temperature' => 'Temperature za AI odgovore (0-2)',
            'ai_enabled' => 'Omogući AI funkcionalnosti',
            'ai_chat_enabled' => 'Omogući AI chat',
            'document_generation_enabled' => 'Omogući generisanje dokumenata',
            'semantic_search_enabled' => 'Omogući semantic search',
            'rate_limit_per_user' => 'Limit zahteva po korisniku',
            'rate_limit_per_hour' => 'Limit zahteva po satu',
            'system_prompt' => 'Sistemski prompt za AI',
        ];

        foreach ($settings as $key => $value) {
            if (isset($settingTypes[$key])) {
                $type = $settingTypes[$key];
                
                // Convert value based on type
                if ($type === 'boolean') {
                    $value = is_bool($value) ? ($value ? 'true' : 'false') : $value;
                } elseif ($type === 'integer') {
                    $value = (string) (int) $value;
                } else {
                    $value = (string) $value;
                }

                if ($key === 'default_model') {
                    $value = $this->normalizeGeminiModelId($value);
                    if ($value === '' || ! in_array($value, self::GEMINI_CHAT_MODELS, true)) {
                        $value = 'gemini-1.5-flash';
                    }
                }

                if ($key === 'gemini_api_key') {
                    $value = trim(str_replace(["\r", "\n"], '', $value));
                }

                // Don't save API key in database if it's empty (keep existing)
                if ($key === 'gemini_api_key' && $value === '') {
                    continue;
                }

                DB::table('system_settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => $value,
                        'type' => $type,
                        'description' => $descriptions[$key] ?? $key,
                        'group' => 'ai',
                        'updated_at' => now(),
                        'created_at' => DB::raw('COALESCE(created_at, NOW())'),
                    ]
                );
            }
        }

        // If API key is provided, update .env file (optional - can be done manually)
        if ($request->has('gemini_api_key') && !empty($request->input('gemini_api_key'))) {
            // Note: In production, this should be done through environment variables
            // For now, we'll just store it in database (encrypted in production)
            // Don't update .env file automatically for security reasons
        }

        // Log activity
        try {
            activity()
                ->causedBy($user)
                ->log('AI configuration updated');
        } catch (\Exception $e) {
            \Log::warning('Failed to log activity: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'AI konfiguracija je uspešno ažurirana',
        ]);
    }

    /**
     * Get AI usage statistics (Admin only)
     */
    public function getAIStats(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $stats = [
            'total_chats' => Schema::hasTable('ai_chats') ? DB::table('ai_chats')->count() : 0,
            'total_messages' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')->count() : 0,
            'total_documents' => Schema::hasTable('ai_document_generations') ? DB::table('ai_document_generations')->count() : 0,
            'active_users' => Schema::hasTable('ai_chats') ? DB::table('ai_chats')
                ->distinct('user_id')
                ->count('user_id') : 0,
            'messages_today' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')
                ->whereDate('created_at', today())
                ->count() : 0,
            'messages_this_week' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count() : 0,
            'messages_this_month' => Schema::hasTable('ai_chat_messages') ? DB::table('ai_chat_messages')
                ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->count() : 0,
            'most_used_model' => (Schema::hasTable('ai_chats') && Schema::hasColumn('ai_chats', 'model')) 
                ? DB::table('ai_chats')
                    ->select('model', DB::raw('count(*) as count'))
                    ->groupBy('model')
                    ->orderBy('count', 'desc')
                    ->first() 
                : null,
            'top_users' => Schema::hasTable('ai_chats') ? DB::table('ai_chats')
                ->select('users.name', 'users.email', DB::raw('count(ai_chats.id) as chat_count'))
                ->join('users', 'ai_chats.user_id', '=', 'users.id')
                ->groupBy('users.id', 'users.name', 'users.email')
                ->orderBy('chat_count', 'desc')
                ->limit(10)
                ->get() : [],
        ];

        return response()->json($stats);
    }

    /**
     * Get AI chat logs (Admin only)
     */
    public function getAIChatLogs(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if tables exist
        if (!Schema::hasTable('ai_chats')) {
            return response()->json([
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 50,
                'total' => 0,
            ]);
        }

        $selectFields = ['ai_chats.*', 'users.name as user_name', 'users.email as user_email'];
        
        // Add model field if it exists
        if (Schema::hasColumn('ai_chats', 'model')) {
            // Model is already included in ai_chats.*
        }
        
        $selectFields[] = DB::raw('(SELECT COUNT(*) FROM ai_chat_messages WHERE ai_chat_messages.chat_id = ai_chats.id) as message_count');
        
        $query = DB::table('ai_chats')
            ->select($selectFields)
            ->leftJoin('users', 'ai_chats.user_id', '=', 'users.id')
            ->orderBy('ai_chats.created_at', 'desc');

        // Filters
        if ($request->has('user_id')) {
            $query->where('ai_chats.user_id', $request->input('user_id'));
        }

        if ($request->has('model') && Schema::hasColumn('ai_chats', 'model')) {
            $query->where('ai_chats.model', $request->input('model'));
        }

        if ($request->has('date_from')) {
            $query->whereDate('ai_chats.created_at', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->whereDate('ai_chats.created_at', '<=', $request->input('date_to'));
        }

        $chats = $query->paginate(50);

        return response()->json($chats);
    }

    /**
     * Test AI connection (Admin only)
     */
    public function testAIConnection(Request $request)
    {
        // Check admin access
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $model = $this->resolveChatModel($request->input('model'));
        if ($model === 'internal') {
            $model = (string) config('services.gemini.chat_model', 'gemini-1.5-flash');
        }
        $apiKey = $this->resolveGeminiApiKey();

        if (! $apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API ključ nije konfigurisan',
                'error' => null,
            ]);
        }

        try {
            $url = sprintf(
                'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
                rawurlencode($model)
            );
            $response = Http::timeout(15)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url.'?key='.rawurlencode($apiKey), [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => 'Reply with OK only.']],
                        ],
                    ],
                    'generationConfig' => [
                        'maxOutputTokens' => 16,
                    ],
                ]);

            if ($response->successful()) {
                $json = $response->json();
                $ok = is_array($json) && ! empty($json['candidates']);
                if ($ok) {
                    return response()->json([
                        'success' => true,
                        'message' => 'AI konekcija uspešna (Google Gemini)',
                        'model' => $model,
                    ]);
                }
            }

            $json = $response->json();
            $errorMsg = 'Nepoznata greška';
            if (is_array($json) && isset($json['error']) && is_array($json['error'])) {
                $errorMsg = (string) ($json['error']['message'] ?? json_encode($json['error']));
            } elseif (is_string($response->body()) && $response->body() !== '') {
                $errorMsg = Str::limit($response->body(), 500);
            }

            $hint = $this->geminiErrorUserHint($response->status(), $errorMsg);

            return response()->json([
                'success' => false,
                'message' => 'AI konekcija neuspešna (HTTP '.$response->status().')',
                'error' => $errorMsg,
                'hint' => $hint,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Greška pri testiranju konekcije',
                'error' => $e->getMessage(),
            ]);
        }
    }
}

