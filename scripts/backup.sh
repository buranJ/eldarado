#!/bin/sh
set -eu

backup_root=${BACKUP_DIR:-/backups}
retention_days=${BACKUP_RETENTION_DAYS:-14}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_root/$timestamp"
temporary="$backup_root/.${timestamp}.tmp"

case "$backup_root" in
  /backups|/backups/*) ;;
  *) echo "BACKUP_DIR must be /backups or a child of it" >&2; exit 1 ;;
esac

rm -rf "$temporary"
mkdir -p "$temporary"
trap 'rm -rf "$temporary"' EXIT INT TERM

pg_dump \
  --host="${POSTGRES_HOST:-db}" \
  --username="${POSTGRES_USER:-gamestock}" \
  --dbname="${POSTGRES_DB:-gamestock}" \
  --format=custom \
  --file="$temporary/database.dump"

tar -C /source-storage -czf "$temporary/storage.tar.gz" .
(cd "$temporary" && sha256sum database.dump storage.tar.gz > SHA256SUMS)
mv "$temporary" "$target"
trap - EXIT INT TERM

find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime "+$retention_days" -exec rm -rf -- {} +
echo "Backup completed: $target"
