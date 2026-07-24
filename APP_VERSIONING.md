# PlanTim - Sistem Verzioniranja

PlanTim aplikacija sada ima potpuni sistem verzioniranja koji automatski prikazuje verziju aplikacije na svim ekranima i omogućava ažuriranje verzije.

## 📋 Funkcionalnosti

- ✅ Automatsko prikazivanje verzije aplikacije u sidebar-u i header-u
- ✅ Automatska provera za nova ažuriranja
- ✅ Artisan komanda za ažuriranje verzije
- ✅ API endpoint za dohvatanje verzije
- ✅ Integracija sa package.json fajlom

## 🚀 Pokretanje

### 1. Pokrenuti migraciju

Prvo pokrenite migraciju da kreirate tabelu `app_versions`:

```bash
php artisan migrate
```

### 2. Pokrenuti seeder (opciono)

Da kreiramo početnu verziju, pokrenite seeder:

```bash
php artisan db:seed --class=AppVersionSeeder
```

Ili ručno kreirajte verziju koristeći Artisan komandu:

```bash
php artisan app:version 1.0.0 --name="Initial Release" --active --latest
```

## 📝 Ažuriranje Verzije

### Automatski bump pri push-u (preporučeno)

Verzija se **automatski povećava** kada pokrenete `PUSH_TO_GITHUB.bat`:

1. Unesete opis promjene (commit poruku)
2. Skripta pokreće `php artisan app:version-bump` — poveća patch verziju (npr. 1.2.0 → 1.2.1)
3. Ažurira `app/release.json` i `frontend/package.json`
4. Commit poruka ide u changelog
5. Sinkronizuje verziju u lokalnu bazu (`--sync`)
6. Na serveru `PULL_FROM_GITHUB.bat` automatski pokreće `app:version-sync`

Ručni bump (opciono):

```bash
php artisan app:version-bump --message="Opis promjene" --sync
php artisan app:version-bump --message="Vece promjene" --type=minor --sync
```

### Ručni način: `app/release.json`

```json
{
  "version": "1.2.0",
  "version_name": "Dashboard i UI",
  "release_notes": "Kratak opis verzije...",
  "changelog": [
    "Prva promjena",
    "Druga promjena"
  ]
}
```

**Workflow:**

1. Na laptopu: uredite `app/release.json` (povećajte verziju i changelog)
2. `PUSH_TO_GITHUB.bat` → merge `develop` → `main` na GitHubu
3. Na serveru: `PULL_FROM_GITHUB.bat` — automatski pokreće `php artisan app:version-sync`

Ručna sinkronizacija (lokalno ili na serveru):

```bash
php artisan app:version-sync
php artisan app:version-sync --dry-run
```

### Korišćenje Artisan komande (ručno)

Osnovna sintaksa:

```bash
php artisan app:version <version> [options]
```

Primeri:

```bash
# Kreirajte novu verziju 1.1.0
php artisan app:version 1.1.0 --name="Feature Update" --active --latest

# Sa release notes
php artisan app:version 1.2.0 --name="Bug Fixes" --notes="Ispravke grešaka u CRM modulu" --active --latest

# Sa changelog (JSON array)
php artisan app:version 2.0.0 --name="Major Update" --changelog='["Nova funkcionalnost A","Ispravke grešaka","Poboljšanja performansi"]' --active --latest
```

### Opcije:

- `--name=` - Ime verzije (npr. "Feature Update", "Bug Fixes")
- `--notes=` - Release notes (opis verzije)
- `--changelog=` - JSON array sa listom promena
- `--active` - Postavi kao aktivnu verziju
- `--latest` - Postavi kao najnoviju verziju

### Format verzije

Verzija mora biti u formatu Semantic Versioning: `X.Y.Z`

Primeri:
- `1.0.0` - Major.Minor.Patch
- `1.1.0` - Minor update
- `1.1.1` - Patch update
- `2.0.0` - Major update

## 🎯 Prikaz Verzije

Verzija se automatski prikazuje na dva mesta:

1. **Sidebar** - Na dnu sidebar-a (uvek vidljiva)
2. **Header** - U header-u (vidljiva na desktop ekranima)

### Komponenta

Komponenta `VersionDisplay` se koristi za prikaz verzije:

```tsx
import VersionDisplay from '@/components/VersionDisplay';

<VersionDisplay showUpdateBadge={true} />
```

### Hook

Za dohvatanje verzije u komponentama, koristite hook:

```tsx
import { useAppVersion } from '@/hooks/useAppVersion';

const { version, loading, checkForUpdates } = useAppVersion();
```

## 🔌 API Endpoints

### GET `/api/app-version/current`

Dohvata trenutnu aktivnu verziju aplikacije.

**Response:**
```json
{
  "version": "1.0.0",
  "version_name": "Initial Release",
  "released_at": "2024-01-01T00:00:00.000000Z",
  "changelog": ["Change 1", "Change 2"],
  "release_notes": "Release notes..."
}
```

### GET `/api/app-version/latest`

Dohvata najnoviju verziju i proverava da li postoji ažuriranje.

**Response:**
```json
{
  "version": "1.1.0",
  "version_name": "Feature Update",
  "released_at": "2024-01-15T00:00:00.000000Z",
  "changelog": ["New feature"],
  "release_notes": "New features added",
  "is_update_available": true,
  "current_version": "1.0.0"
}
```

## 📦 Integracija sa package.json

Kada ažurirate verziju koristeći Artisan komandu, automatski se ažurira i `frontend/package.json` fajl.

Takođe, ako verzija ne postoji u bazi podataka, sistem će pokušati da je učita iz `package.json` fajla.

## 🔄 Workflow za Nova Izdanja

1. **Razvoj** - Razvijte nove funkcionalnosti
2. **Ažurirajte verziju**:
   ```bash
   php artisan app:version 1.1.0 --name="New Features" --active --latest --notes="Added new features"
   ```
3. **Commit i Push** - Commit-ujte promene
4. **Deploy** - Deploy-ujte na produkciju
5. **Korisnici** - Korisnici će automatski videti novu verziju i notifikaciju o ažuriranju

## 📊 Baza Podataka

### Tabela `app_versions`

- `id` - Primary key
- `version` - Verzija (unique, npr. "1.0.0")
- `version_name` - Ime verzije
- `changelog` - JSON array sa promenama
- `release_notes` - Release notes
- `is_active` - Da li je aktivna verzija
- `is_latest` - Da li je najnovija verzija
- `released_at` - Datum objavljivanja
- `created_at` - Datum kreiranja
- `updated_at` - Datum ažuriranja

## 🛠️ Troubleshooting

### Verzija se ne prikazuje

1. Proverite da li je migracija pokrenuta: `php artisan migrate`
2. Proverite da li postoji aktivna verzija u bazi: `php artisan tinker` → `AppVersion::current()`
3. Proverite API endpoint: `curl http://localhost:8000/api/app-version/current`

### Artisan komanda ne radi

1. Proverite da li je format verzije ispravan (X.Y.Z)
2. Proverite da li imate dozvole za pisanje u `frontend/package.json`
3. Proverite da li Laravel log fajl sadrži greške

### Update badge se ne prikazuje

1. Proverite da li postoji `is_latest=true` verzija u bazi
2. Proverite da li je verzija veća od trenutne verzije
3. Proverite browser konzolu za greške

## 📚 Dodatne Informacije

Za više informacija o Semantic Versioning, posetite: https://semver.org/











