#!/bin/bash
set -euo pipefail

cd /app
mkdir -p /app/uploads /tmp/nginx/client_temp /tmp/nginx/proxy_temp \
  /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp
if [ -d /app/backend/seed-uploads ]; then
  cp -n /app/backend/seed-uploads/* /app/uploads/ 2>/dev/null || true
fi

node backend/dist/db/migrate.js

PORT=4000 node backend/dist/index.js &
api_pid=$!

cd /app/web
PORT=3000 HOSTNAME=127.0.0.1 node server.js &
web_pid=$!

sed "s/__PORT__/${PORT:-10000}/g" /etc/nginx/single.conf.template > /tmp/nginx/nginx.conf
/usr/sbin/nginx -c /tmp/nginx/nginx.conf -g 'daemon off;' &
nginx_pid=$!

cleanup() {
  kill "$api_pid" "$web_pid" "$nginx_pid" 2>/dev/null || true
  wait "$api_pid" "$web_pid" "$nginx_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$api_pid" "$web_pid" "$nginx_pid"
