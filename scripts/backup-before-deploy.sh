#!/usr/bin/env bash
# PlanTim — backup baze prije deploy-a (Linux / produkcija)
# Čita DB_* vrijednosti iz .env u rootu projekta.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
BACKUP_DIR="$ROOT/backups"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "GRESKA: .env nije pronađen u $ROOT"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source <(grep -E '^[A-Z_]+=' "$ENV_FILE" | sed 's/\r$//')
set +a

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:?DB_DATABASE nije definisan u .env}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT="$BACKUP_DIR/pre_deploy_${TIMESTAMP}.sql"

echo "PlanTim backup prije deploy-a"
echo "Baza: $DB_DATABASE"
echo "Izlaz: $OUTPUT"

export MYSQL_PWD="$DB_PASSWORD"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" \
  --single-transaction --routines --triggers \
  "$DB_DATABASE" > "$OUTPUT"
unset MYSQL_PWD

if [[ ! -s "$OUTPUT" ]]; then
  echo "GRESKA: Backup fajl je prazan."
  exit 1
fi

SIZE="$(du -h "$OUTPUT" | cut -f1)"
echo "Backup uspješan ($SIZE)."
echo "Čuvajte kopiju izvan servera prije git pull + migrate.php."
