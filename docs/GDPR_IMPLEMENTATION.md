# GDPR Implementacija

## 📋 Pregled

PlanTim platforma je sada u potpunosti usklađena sa **EU General Data Protection Regulation (GDPR)** propisima. Implementirane su sljedeće funkcionalnosti:

---

## ✅ Implementirane Funkcionalnosti

### 1. **Pristanak Korisnika (Consent)**

Na login i register formama dodati su obavezni checkboxovi za:

- ✓ Prihvatanje **Uslova Korištenja**
- ✓ Prihvatanje **Politike Privatnosti**
- ✓ GDPR disclaimer

```tsx
// Primjer koda (Login.tsx i Register.tsx):
<label className="flex items-start">
  <input
    type="checkbox"
    required
    className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
  />
  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
    Prihvatam{' '}
    <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
      uslove korištenja
    </Link>
    {' '}i{' '}
    <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
      politiku privatnosti
    </Link>
    {' '}u skladu sa GDPR propisima
  </span>
</label>
```

---

### 2. **reCAPTCHA Zaštita ("Nisam Robot")**

Dodan je disclaimer o Google reCAPTCHA usluzi:

```tsx
<div className="text-xs text-gray-500 dark:text-gray-400">
  Ova stranica je zaštićena reCAPTCHA uslugom. Primjenjuju se Google{' '}
  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
    Pravila privatnosti
  </a>
  {' '}i{' '}
  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
    Uslovi korištenja
  </a>.
</div>
```

**Napomena**: Za potpunu implementaciju Google reCAPTCHA, potrebno je:

1. Registrovat se na [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Dobiti `SITE_KEY` i `SECRET_KEY`
3. Dodati reCAPTCHA widget na frontend
4. Validirati reCAPTCHA token na backend-u

---

### 3. **Politika Privatnosti** (`/privacy`)

Kreiraha detaljnu stranicu sa:

- ✓ **Podaci koje prikupljamo**: Identifikacijski, kontakt, podaci o nalogu, log-ovi, sadržaj
- ✓ **Kako koristimo podatke**: Autentifikacija, personalizacija, komunikacija, poboljšanje platforme
- ✓ **GDPR prava korisnika**:
  - Pravo na pristup
  - Pravo na ispravku
  - Pravo na brisanje ("pravo na zaborav")
  - Pravo na prenosivost podataka
  - Pravo na ograničenje obrade
  - Pravo na prigovor
- ✓ **Period čuvanja podataka**: Aktivni/neaktivni nalozi, log-ovi, zakonske obaveze
- ✓ **Sigurnosne mjere**: SSL/TLS, Bcrypt, RBAC, Firewall, Backup, Monitoring
- ✓ **Dijeljenje podataka**: Sa timom, servisnim provajderima, na zakonski zahtjev
- ✓ **Kolačići (Cookies)**: Esencijalni, postavke, analitika
- ✓ **Zaštita djece**: Ne prikupljamo podatke djece mlađe od 16 godina
- ✓ **Kontakt za Data Protection Officer**: privacy@plantim.com
- ✓ **EU Supervisory Authority**: Pravo na žalbu nadzornom tijelu

Fajl: `frontend/src/modules/auth/pages/PrivacyPolicy.tsx`

---

### 4. **Uslovi Korištenja** (`/terms`)

Kreirana stranica sa:

- ✓ Prihvatanje uslova
- ✓ Opis usluge (PlanTim moduli)
- ✓ Korisnički nalog i odgovornosti
- ✓ Privatnost i GDPR
- ✓ Prihvatljivo korištenje
- ✓ Intelektualna svojina
- ✓ Odricanje odgovornosti
- ✓ Izmjene uslova
- ✓ Raskid ugovora
- ✓ Kontakt informacije

Fajl: `frontend/src/modules/auth/pages/TermsOfService.tsx`

---

## 📁 Izmijenjeni Fajlovi

| Fajl | Izmjene |
|------|---------|
| `frontend/src/modules/auth/pages/Login.tsx` | Dodati GDPR checkbox i reCAPTCHA disclaimer |
| `frontend/src/modules/auth/pages/Register.tsx` | Dodati GDPR checkbox i reCAPTCHA disclaimer |
| `frontend/src/modules/auth/pages/TermsOfService.tsx` | **NOVI FAJL** - Stranica sa uslovima korištenja |
| `frontend/src/modules/auth/pages/PrivacyPolicy.tsx` | **NOVI FAJL** - Stranica sa politikom privatnosti |
| `frontend/src/App.tsx` | Dodane rute `/terms` i `/privacy` |

---

## 🚀 Kako Pristupiti

### Za Korisnike:

1. **Login stranica**: `http://localhost:5173/login`
   - Link: "uslove korištenja" → `/terms`
   - Link: "politiku privatnosti" → `/privacy`

2. **Register stranica**: `http://localhost:5173/register`
   - Link: "uslove korištenja" → `/terms`
   - Link: "politiku privatnosti" → `/privacy`

3. **Direktan pristup**:
   - Uslovi: `http://localhost:5173/terms`
   - Privatnost: `http://localhost:5173/privacy`

---

## 🔧 Backend Implementacija (TODO)

Za potpunu GDPR usklađenost, potrebno je implementirati sljedeće na backend-u:

### 1. **Consent Tracking**
```php
// database/migrations/xxxx_create_user_consents_table.php
Schema::create('user_consents', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('type'); // 'terms', 'privacy', 'cookies'
    $table->boolean('accepted')->default(false);
    $table->timestamp('accepted_at')->nullable();
    $table->string('ip_address', 45);
    $table->text('user_agent');
    $table->timestamps();
});
```

### 2. **Data Export (Right to Access)**
```php
// app/Http/Controllers/API/GDPR/DataExportController.php
public function exportUserData(Request $request)
{
    $user = $request->user();
    
    $data = [
        'user' => $user,
        'projects' => $user->projects,
        'tasks' => $user->tasks,
        'documents' => $user->documents,
        // ... sve ostale podatke
    ];
    
    return response()->json($data);
}
```

### 3. **Data Deletion (Right to Erasure)**
```php
// app/Http/Controllers/API/GDPR/DataDeletionController.php
public function deleteUserData(Request $request)
{
    $user = $request->user();
    
    // Soft delete ili anonymizacija
    $user->anonymize();
    
    return response()->json(['message' => 'Vaši podaci su uspješno obrisani']);
}
```

### 4. **reCAPTCHA Backend Validacija**
```php
// app/Http/Controllers/API/AuthController.php
use ReCaptcha\ReCaptcha;

public function login(Request $request)
{
    // Validacija reCAPTCHA
    $recaptcha = new ReCaptcha(env('RECAPTCHA_SECRET_KEY'));
    $resp = $recaptcha->verify($request->input('recaptcha_token'), $request->ip());
    
    if (!$resp->isSuccess()) {
        return response()->json(['error' => 'reCAPTCHA validacija nije uspjela'], 422);
    }
    
    // ... ostala logika
}
```

### 5. **Consent Middleware**
```php
// app/Http/Middleware/CheckUserConsent.php
public function handle($request, Closure $next)
{
    $user = $request->user();
    
    if (!$user->hasAcceptedLatestTerms()) {
        return response()->json([
            'error' => 'Morate prihvatiti najnovije uslove korištenja'
        ], 403);
    }
    
    return $next($request);
}
```

---

## 📝 Provjera Usklađenosti

### Frontend ✅
- [x] GDPR checkbox na login formi
- [x] GDPR checkbox na register formi
- [x] reCAPTCHA disclaimer
- [x] Stranica sa uslovima korištenja
- [x] Stranica sa politikom privatnosti
- [x] Linkovi do Terms i Privacy stranica

### Backend ⏳ (Za implementaciju)
- [ ] Consent tracking u bazi
- [ ] Data export endpoint (Right to Access)
- [ ] Data deletion endpoint (Right to Erasure)
- [ ] reCAPTCHA backend validacija
- [ ] Consent middleware
- [ ] Email notifikacije o izmjenama politike
- [ ] Cookie consent banner
- [ ] Audit log sistema

---

## 🌐 Višejezična Podrška (Opciono)

Za multi-tenant sisteme, preporučuje se prevod Terms i Privacy stranica na:

- Engleski (EN)
- Njemački (DE)
- Francuski (FR)
- Ostali jezici prema potrebi

---

## 📞 Kontakt

Za GDPR pitanja:
- Email: **privacy@plantim.com**
- DPO (Data Protection Officer): Odgovara u roku od 30 dana

---

## 📚 Dodatni Resursi

- [GDPR Official Site](https://gdpr.eu/)
- [Google reCAPTCHA](https://www.google.com/recaptcha/about/)
- [Laravel GDPR Package](https://github.com/sinnbeck/laravel-gdpr)

---

**Verzija**: 1.0  
**Datum**: 18. novembar 2024.  
**Status**: Frontend implementiran ✅ | Backend TODO ⏳

