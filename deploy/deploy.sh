#!/usr/bin/env bash
# Pull latest code and reload. Usage: bash ~/node-lightsail-api/deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies"
npm ci --omit=dev

echo "==> Reloading PM2"
pm2 reload ecosystem.config.js --env production --update-env
pm2 save

echo "==> Checking health"
sleep 2
curl -fsS http://127.0.0.1/health && echo
