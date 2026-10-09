#!/usr/bin/env bash
# First-time setup on a fresh Lightsail Ubuntu 22.04/24.04 instance.
# Run as the ubuntu user after cloning: bash ~/node-lightsail-api/deploy/setup.sh
set -euo pipefail

APP_NAME="node-lightsail-api"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MAJOR=22

echo "==> Installing system packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git nginx

if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null; then
  echo "==> Installing PM2"
  sudo npm install -g pm2
fi

echo "==> Installing app dependencies"
cd "$APP_DIR"
npm ci --omit=dev

if [[ ! -f .env ]]; then
  echo "==> Creating .env with a new API key"
  (
    umask 077
    cat > .env <<EOF
NODE_ENV=production
PORT=3000
API_KEY=$(openssl rand -hex 32)
EOF
  )
fi

echo "==> Starting the app with PM2"
pm2 startOrReload ecosystem.config.js --env production
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME"

echo "==> Configuring NGINX"
sudo cp deploy/nginx.conf "/etc/nginx/sites-available/$APP_NAME"
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Checking health"
sleep 2
curl -fsS http://127.0.0.1/health && echo

PUBLIC_IP="$(curl -fsS https://checkip.amazonaws.com || echo '<your-static-ip>')"
echo
echo "Done. The API is live:"
echo "  Docs:   http://${PUBLIC_IP}/docs"
echo "  Health: http://${PUBLIC_IP}/health"
echo "Your API key is in $APP_DIR/.env (keep it private)."
