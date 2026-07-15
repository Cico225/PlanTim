# PlanTim

Enterprise kolaboracijski alat — Laravel 10 + React/TypeScript.

## Brzi start (lokalno)

1. Kopiraj `.env.example` → `.env` i popuni DB podatke
2. `composer install`
3. `php artisan key:generate`
4. `php migrate.php` — SQL migracije strukture baze
5. `php artisan migrate` — legacy Laravel migracije (ako treba)
6. `cd frontend && npm install && npm run dev`

## Deploy i Git

Pogledaj **[DEPLOYMENT.md](DEPLOYMENT.md)** za:

- Git workflow (`main` / `develop` / `feature/*`)
- Produkcijski deploy
- Backup baze prije deploy-a
- SQL migracije

## SQL migracije

Nove promjene strukture baze dodajte u `database/migrations/sql/` i pokrenite:

```bash
php migrate.php
```
