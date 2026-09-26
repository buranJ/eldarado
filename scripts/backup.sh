#!/bin/sh
set -eu

backup_root=${BACKUP_DIR:-/backups}
retention_days=${BACKUP_RETENTION_DAYS:-14}
minimum_age_seconds=${BACKUP_MIN_AGE_SECONDS:-82800}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_root/$timestamp"
temporary="$backup_root/.${timestamp}.tmp"

case "$backup_root" in
  /backups|/backups/*) ;;
  *) echo "BACKUP_DIR must be /backups or a child of it" >&2; exit 1 ;;
esac

latest_backup=$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -print 2>/dev/null | sort | tail -n 1)
if [ -n "$latest_backup" ]; then
  latest_modified=$(stat -c %Y "$latest_backup")
  now=$(date +%s)
  age_seconds=$((now - latest_modified))
  if [ "$age_seconds" -lt "$minimum_age_seconds" ]; then
    echo "Recent backup already exists: $latest_backup (${age_seconds}s old)"
    exit 0
  fi
fi

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

if [ -n "${S3_BUCKET:-}" ]; then
  : "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID is required when S3_BUCKET is set}"
  : "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY is required when S3_BUCKET is set}"
  export RCLONE_CONFIG_GAMESTOCK_TYPE=s3
  export RCLONE_CONFIG_GAMESTOCK_PROVIDER="${S3_PROVIDER:-Other}"
  export RCLONE_CONFIG_GAMESTOCK_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_GAMESTOCK_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_GAMESTOCK_REGION="${S3_REGION:-auto}"
  if [ -n "${S3_ENDPOINT:-}" ]; then
    export RCLONE_CONFIG_GAMESTOCK_ENDPOINT="$S3_ENDPOINT"
  fi
  destination="gamestock:${S3_BUCKET}"
  prefix=$(printf '%s' "${S3_PREFIX:-}" | sed 's#^/*##; s#/*$##')
  if [ -n "$prefix" ]; then
    destination="$destination/$prefix"
  fi
  destination="$destination/$timestamp"
  rclone copy "$target" "$destination" --immutable
  echo "External backup uploaded: s3://${S3_BUCKET}/${prefix:+$prefix/}$timestamp"
fi

find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime "+$retention_days" -exec rm -rf -- {} +
echo "Backup completed: $target"
