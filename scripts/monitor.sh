#!/bin/sh
set -eu

interval=${MONITOR_INTERVAL_SECONDS:-300}
disk_limit=${MONITOR_DISK_USED_PERCENT:-85}
state_file=/tmp/gamestock-monitor.state
tls_host=${MONITOR_TLS_HOST:-}
tls_expiry_days=${MONITOR_TLS_EXPIRY_DAYS:-14}
backup_max_age=${MONITOR_BACKUP_MAX_AGE_SECONDS:-129600}

notify() {
  level=$1
  message=$2
  printf '%s [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$message"
  if [ -n "${MONITOR_WEBHOOK_URL:-}" ]; then
    escaped=$(printf '%s' "$message" | sed 's/\\/\\\\/g; s/"/\\"/g')
    curl --silent --show-error --fail --max-time 10 \
      -H 'Content-Type: application/json' \
      --data "{\"text\":\"GameStock [$level] $escaped\"}" \
      "$MONITOR_WEBHOOK_URL" >/dev/null || true
  fi
}

check_url() {
  name=$1
  url=$2
  curl --silent --show-error --fail --max-time 20 \
    -A 'GameStock/0.1 availability-monitor' "$url" >/dev/null 2>&1 || failures="$failures $name"
}

check_eldorado_api() {
  status=$(curl --silent --show-error --max-time 20 -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' --data '{}' \
    https://www.eldorado.gg/api/authentication/seller/token 2>/dev/null || printf '000')
  case "$status" in
    2??|4??) ;;
    *) failures="$failures eldorado" ;;
  esac
}

check_tls() {
  [ -z "$tls_host" ] && return
  seconds=$((tls_expiry_days * 86400))
  if ! printf '' | openssl s_client -connect "$tls_host:443" -servername "$tls_host" 2>/dev/null \
    | openssl x509 -noout -checkend "$seconds" >/dev/null 2>&1; then
    failures="$failures tls:$tls_host"
  fi
}

check_backup() {
  latest=$(find /backups -mindepth 1 -maxdepth 1 -type d | sort | tail -1)
  if [ -z "$latest" ]; then
    failures="$failures backup:missing"
    return
  fi
  modified=$(stat -c %Y "$latest" 2>/dev/null || printf '0')
  age=$(($(date +%s) - modified))
  if [ "$modified" -eq 0 ] || [ "$age" -gt "$backup_max_age" ]; then
    failures="$failures backup:stale"
  fi
}

while true; do
  failures=''
  check_url api http://api:3001/api/health
  check_url web http://web/healthz
  check_url funpay https://funpay.com/lots/149/
  check_eldorado_api
  check_tls
  check_backup

  disk_used=$(df -P /data | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')
  if [ -z "$disk_used" ] || [ "$disk_used" -ge "$disk_limit" ]; then
    failures="$failures disk:${disk_used:-unknown}%"
  fi

  current=$(printf '%s' "$failures" | sed 's/^ *//')
  previous=$(cat "$state_file" 2>/dev/null || true)
  if [ "$current" != "$previous" ]; then
    if [ -n "$current" ]; then
      notify ERROR "Unavailable checks:$current"
    elif [ -n "$previous" ]; then
      notify RECOVERED "All checks are healthy"
    fi
    printf '%s' "$current" > "$state_file"
  fi
  sleep "$interval"
done
