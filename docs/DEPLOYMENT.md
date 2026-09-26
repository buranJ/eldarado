# GameStock deployment

The production stack consists of five containers: the static web interface,
the Fastify API, PostgreSQL, the backup runner and the external health monitor.
Host Nginx terminates HTTPS and proxies traffic to loopback-only container ports.

## Server environment

Copy `.env.production.example` to `.env.production` and replace every required
value. `POSTGRES_PASSWORD` and the password embedded in `DATABASE_URL` must be
identical. Keep the existing `CREDENTIAL_ENCRYPTION_KEY` when migrating a
database that already contains encrypted integration credentials.

## Start

```bash
docker compose --env-file .env.production up -d --build
```

The API listens on `127.0.0.1:3001`; the web container listens on
`127.0.0.1:3100`. Neither PostgreSQL nor the application ports should be opened
to the public internet.

## Host Nginx

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Validate with `nginx -t` before reloading Nginx.

## Backup

The `backup` service runs once immediately after startup and then every
`BACKUP_INTERVAL_SECONDS` seconds. Every timestamped directory contains:

- `database.dump` — PostgreSQL custom-format dump;
- `storage.tar.gz` — collected account images and durable settings;
- `SHA256SUMS` — integrity hashes.

Backups older than `BACKUP_RETENTION_DAYS` are removed. The default keeps the
current and previous daily backup because account photos make each archive large.
Verify the latest backup:

```bash
cd "$(find /opt/gamestock-backups -mindepth 1 -maxdepth 1 -type d | sort | tail -1)"
sha256sum -c SHA256SUMS
```

The repository also contains a non-destructive verification command which
checks hashes, the PostgreSQL archive catalogue and the complete photo archive:

```bash
docker compose --env-file .env.production exec -T backup \
  /scripts/verify-backup.sh /backups/BACKUP_NAME
```

Restore into an empty database and data directory:

```bash
docker compose --env-file .env.production stop api web backup
docker compose --env-file .env.production exec -T db \
  pg_restore -U gamestock -d gamestock --clean --if-exists < /path/to/database.dump
tar -C /opt/gamestock-data/storage -xzf /path/to/storage.tar.gz
docker compose --env-file .env.production up -d
```

Always test restoration on a separate database before using it against production.

## Monitoring

The `monitor` service checks the API health endpoint, web container, FunPay,
Eldorado and disk usage every five minutes. It logs only state changes. Set
`MONITOR_WEBHOOK_URL` to receive outage, recovery and unhandled API-error messages.
The endpoint must accept a JSON object with a `text` field. Inspect status with:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --since=30m monitor backup api
curl --fail https://your-domain.example/api/health
```

The API health response includes PostgreSQL latency and storage free-space data.
