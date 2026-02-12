#!/bin/sh
# Debug script to check backend health endpoint from inside the container
set -e

for i in $(seq 1 10); do
  echo "[healthcheck-debug] Attempt $i: curl http://localhost:3001/health"
  curl -v --max-time 5 http://localhost:3001/health || echo "[healthcheck-debug] curl failed"
  sleep 3
done
