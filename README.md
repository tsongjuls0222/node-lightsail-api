# node-lightsail-api

Small Express REST API running on an AWS Lightsail instance, with PM2 keeping it up and NGINX in front as a reverse proxy.

Live: `http://<your-static-ip>/docs`

Stack: Node.js 22, Express 5, zod, PM2, NGINX, Ubuntu 24.04 on Lightsail.

Request flow: client → NGINX (port 80, rate limited) → PM2 → Node app on 127.0.0.1:3000

## Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/health` | - |
| GET | `/docs` (Swagger UI) | - |
| GET | `/api/v1/tasks?status=&page=&limit=` | - |
| GET | `/api/v1/tasks/:id` | - |
| POST | `/api/v1/tasks` | `X-API-Key` |
| PATCH | `/api/v1/tasks/:id` | `X-API-Key` |
| DELETE | `/api/v1/tasks/:id` | `X-API-Key` |

Errors come back as `{ "error": { "code", "message", "details" } }`.

Tasks are stored in memory for now, so they reset when the app restarts.

## Running locally

```bash
npm install
npm run dev     # http://127.0.0.1:3000/docs, API key is "dev-key" unless set in .env
npm test
```

## Deploying to Lightsail

1. Create an instance: Linux/Unix → OS Only → Ubuntu 24.04 LTS, smallest plan.
2. Networking → create a static IP and attach it.
3. Firewall: 22 and 80 are open by default. Open 443 too if you add a domain.
4. SSH in (browser button or `ssh -i LightsailDefaultKey.pem ubuntu@<ip>`) and run:

```bash
git clone https://github.com/tsongjuls0222/node-lightsail-api.git
bash ~/node-lightsail-api/deploy/setup.sh
```

`setup.sh` installs Node 22, PM2 and NGINX, generates `.env` with a random API key, starts the app under PM2, sets PM2 to start on boot, and installs the NGINX config.

To deploy changes, take a snapshot first, then:

```bash
bash ~/node-lightsail-api/deploy/deploy.sh
```

### HTTPS

Point a domain's A record at the static IP, set `server_name` in the NGINX config, then:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

Then remove the `upgradeInsecureRequests: null` override in `src/app.js`.

## Useful commands

```bash
pm2 status
pm2 logs node-lightsail-api
pm2 restart node-lightsail-api      # after editing .env
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/node-lightsail-api.error.log
```

## License

MIT
