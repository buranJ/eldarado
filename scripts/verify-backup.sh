#!/bin/sh
set -eu

backup_path=${1:-}

if [ -z "$backup_path" ] || [ ! -d "$backup_path" ]; then
  echo "Usage: $0 /path/to/backup" >&2
  exit 2
fi

for file in database.dump storage.tar.gz SHA256SUMS; do
  if [ ! -f "$backup_path/$file" ]; then
    echo "Missing backup file: $file" >&2
    exit 1
  fi
done

(cd "$backup_path" && sha256sum -c SHA256SUMS)
pg_restore --list "$backup_path/database.dump" >/dev/null
tar -tzf "$backup_path/storage.tar.gz" >/dev/null

echo "Backup verified: $backup_path"
