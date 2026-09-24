# GameStock deployment

The production stack consists of three containers: the static web interface,
the Fastify API and PostgreSQL. Host Nginx terminates HTTPS and proxies traffic
to loopback-only container ports.

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

```bash
docker compose --env-file .env.production exec -T db \
  pg_dump -U gamestock -d gamestock -Fc > gamestock.dump
```

Back up the directory configured by `GAMESTOCK_DATA_DIR` as well; it contains
the account images collected from source marketplaces.

