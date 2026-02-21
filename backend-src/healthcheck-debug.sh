#!/bin/sh
# Debug script to check backend health endpoint from inside the container
set -e

for i in $(seq 1 10); do
  echo "[healthcheck-debug] Attempt $i: curl https://devapi.adaptivegis.com/health"
  curl -v --max-time 5 https://devapi.adaptivegis.com/health || echo "[healthcheck-debug] curl failed"
  sleep 3
done
