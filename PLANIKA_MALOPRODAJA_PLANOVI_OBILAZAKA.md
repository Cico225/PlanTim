# Planika Maloprodaja - Planovi Kontrola i Obilazaka Prodavnica

## ✅ Implementirano

### 1. Database Proširenja

#### Kategorizacija Prodavnica
- ✅ Dodato polje `category` (A, B, C) u `planika_maloprodaja_stores`
- ✅ Dodato polje `categorization_data` (JSON) - promet, lokacija, zaposleni, ocjene
- ✅ Tabela `planika_maloprodaja_store_category_history` - istorija promjena kategorija

#### Tipovi Planova
- ✅ Prošireno `planika_maloprodaja_activity_plans` sa:
  - `plan_type` (regular, focused, emergency, seasonal)
  - `trigger_criteria` (kriteriji za okidač)
  - `required_activities` (obavezne aktivnosti po obilasku)
  - `kpi_thresholds` (KPI pragovi)
  - `auto_generate_calendar` (automatsko generisanje kalendara)
  - `auto_balancing` (balansiranje ruta)

#### Kalendar Obilazaka
- ✅ Tabela `planika_maloprodaja_visit_schedules`:
  - Planirani obilasci
  - Status (planned, in_progress, completed, missed, cancelled)
  - Redoslijed u rutu
  - Podaci za optimizaciju rute

#### Obilasci Prodavnica
- ✅ Tabela `planika_maloprodaja_store_visits`:
  - Check-in/check-out sa GPS koordinatama
  - Povezanost sa kontrolama i ocjenama
  - Fotografije
  - Coaching aktivnosti
  - Meta-kontrola kvaliteta obilaska

#### Automatizacija
- ✅ Tabela `planika_maloprodaja_visit_reminders` - podsjetnici
- ✅ Tabela `planika_maloprodaja_visit_escalations` - eskalacije

### 2. Backend Models

- ✅ `VisitSchedule` - Kalendar obilazaka
- ✅ `StoreVisit` - Obilasci prodavnica
- ✅ `VisitReminder` - Podsjetnici
- ✅ `VisitEscalation` - Eskalacije
- ✅ `StoreCategoryHistory` - Istorija kategorizacije
- ✅ Prošireni `ActivityPlan` i `Store` models

### 3. Backend Controller Funkcionalnosti

#### Kategorizacija Prodavnica
- ✅ `updateStoreCategory()` - Ažuriranje kategorije prodavnice
- ✅ `autoCategorizeStores()` - Automatska kategorizacija na osnovu statistika

#### Kalendar Obilazaka
- ✅ `generateVisitSchedule()` - Automatsko generisanje kalendara obilazaka
  - Različite frekvencije po tipu plana i kategoriji prodavnice:
    - A prodavnice: 2x mjesečno (redovni plan)
    - B prodavnice: 1x mjesečno (redovni plan)
    - C prodavnice: 1x kvartalno (redovni plan)
    - Fokusirani plan: svake 2 sedmice
    - Vanredni plan: odmah
  - Automatsko kreiranje podsjetnika
- ✅ `getVisitSchedules()` - Pregled rasporeda obilazaka

#### Obilasci
- ✅ `checkInVisit()` - Check-in u prodavnicu (GPS/QR kod)
- ✅ `checkOutVisit()` - Check-out iz prodavnice
- ✅ `getStoreVisits()` - Pregled obilazaka

#### Automatizovani Scenariji
- ✅ `checkAutomatedScenarios()` - Provjera i aktivacija automatskih scenarija:
  - Prodavnica ispod 3.0 → preporuka za fokus plan
  - Propušten obilazak → automatska eskalacija

### 4. API Routes

- ✅ `PUT /api/planika/maloprodaja/stores/{id}/category` - Ažuriranje kategorije
- ✅ `POST /api/planika/maloprodaja/stores/auto-categorize` - Automatska kategorizacija
- ✅ `GET /api/planika/maloprodaja/visit-schedules` - Pregled rasporeda
- ✅ `POST /api/planika/maloprodaja/plans/{id}/generate-schedule` - Generisanje kalendara
- ✅ `GET /api/planika/maloprodaja/visits` - Pregled obilazaka
- ✅ `POST /api/planika/maloprodaja/visit-schedules/{id}/check-in` - Check-in
- ✅ `POST /api/planika/maloprodaja/visits/{id}/check-out` - Check-out
- ✅ `GET /api/planika/maloprodaja/automated-scenarios` - Automatski scenariji

## 📋 Tipovi Planova - Implementacija

### 1. Redovni Plan Obilazaka
- ✅ **Frekvencija**: Automatski određuje na osnovu kategorije prodavnice
- ✅ **Automatsko kreiranje kalendara**: Implementirano
- ✅ **Balansiranje ruta**: Struktura podržava, algoritam može biti proširen
- ✅ **Upozorenja**: Automatska eskalacija za propuštene obilaske

### 2. Fokusirani Plan Obilazaka
- ✅ **Tip plana**: `focused`
- ✅ **Frekvencija**: Svake 2 sedmice
- ✅ **Trigger kriteriji**: Podržano u `trigger_criteria` polju
- ✅ **Coaching aktivnosti**: Podržano u `coaching_activities` polju obilaska

### 3. Vanredni Plan Obilazaka
- ✅ **Tip plana**: `emergency`
- ✅ **Hitno izvršenje**: Immediate frequency
- ✅ **Push notifikacije**: Struktura podržava (reminders tabela)
- ✅ **Dokumentacija**: Podržano fotografije u `photos` polju

### 4. Sezonski Plan Obilazaka
- ✅ **Tip plana**: `seasonal`
- ✅ **Povezanost sa kampanjama**: Može se proširiti
- ✅ **Automatsko aktiviranje**: Podržano kroz `auto_generate_calendar`

## 🔧 Kako koristiti

### 1. Kreiranje plana sa tipom
```php
// Pri kreiranju plana, dodati:
'plan_type' => 'regular' | 'focused' | 'emergency' | 'seasonal'
'trigger_criteria' => [...] // Za fokusirane i vanredne planove
'required_activities' => [...] // Obavezne aktivnosti
'auto_generate_calendar' => true
```

### 2. Generisanje kalendara obilazaka
```
POST /api/planika/maloprodaja/plans/{plan_id}/generate-schedule
```

Sistem automatski:
- Određuje frekvenciju na osnovu tipa plana i kategorije prodavnice
- Kreira termine obilazaka
- Postavlja podsjetnike

### 3. Check-in u prodavnicu
```
POST /api/planika/maloprodaja/visit-schedules/{schedule_id}/check-in
{
  "latitude": 43.8563,
  "longitude": 18.4131,
  "check_in_method": "GPS"
}
```

### 4. Check-out iz prodavnice
```
POST /api/planika/maloprodaja/visits/{visit_id}/check-out
{
  "control_id": 123,
  "store_manager_evaluation_id": 456,
  "visit_summary": "...",
  "photos": ["url1", "url2"]
}
```

## 📋 Preostalo za Frontend

### 1. Kalendar Komponente
- ⏳ Kalendar pregled obilazaka (sedmični/mjesečni)
- ⏳ Mapa lokacija prodavnica
- ⏳ Optimizacija rute (vizualizacija)

### 2. Tok Obilaska
- ⏳ Check-in forma (GPS lokacija)
- ⏳ Upload fotografija
- ⏳ Popunjavanje obrazaca tokom obilaska
- ⏳ Offline režim rada

### 3. Dashboard
- ⏳ Pregled propuštenih obilazaka
- ⏳ Eskalacije i upozorenja
- ⏳ Statistike pokrivenosti

### 4. Kategorizacija
- ⏳ Interfejs za ažuriranje kategorije prodavnice
- ⏳ Automatska kategorizacija (dugme)
- ⏳ Pregled istorije kategorizacije

### 5. Automatizovani Scenariji
- ⏳ Dashboard sa aktivnim scenarijima
- ⏳ Notifikacije za automatske akcije

## 🚀 Sljedeći koraci

1. ✅ Pokrenuti migraciju: `php artisan migrate`
2. ⏳ Kreirati frontend komponente za kalendar
3. ⏳ Implementirati check-in/check-out funkcionalnost
4. ⏳ Dodati mapu lokacija
5. ⏳ Implementirati offline režim
6. ⏳ Dodati push notifikacije za podsjetnike
7. ⏳ Kreirati dashboard za automatizovane scenarije

## 📝 Napomene

- **Balansiranje ruta**: Osnovna struktura je implementirana, algoritam optimizacije može biti dodat
- **Offline režim**: Backend je spreman, frontend treba implementirati lokalno skladištenje
- **GPS validacija**: Može se dodati provjera udaljenosti od prodavnice pri check-inu
- **Fotografije**: Upload treba implementirati (može koristiti postojeći DMS modul)
- **Notifikacije**: Push notifikacije mogu koristiti postojeći notification sistem

