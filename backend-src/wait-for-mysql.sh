#!/bin/sh
# Wait for MySQL to be ready before starting the backend
set -e

host="$DB_HOST"
port="${DB_PORT:-3306}"

until nc -z "$host" "$port"; do
  echo "Waiting for MySQL at $host:$port..."
  sleep 2
done

echo "MySQL is up - starting backend"
exec "$@"
