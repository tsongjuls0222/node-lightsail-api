# node-lightsail-api

Small Express REST API running on an AWS Lightsail instance, with PM2 keeping it up and NGINX in front as a reverse proxy.

Live: `http://<your-static-ip>/docs`

Stack: Node.js 22, Express 5, zod, pino, PM2, NGINX, Ubuntu 24.04 on Lightsail.

Request flow: client → NGINX (port 80, rate limited) → PM2 → Node app on 127.0.0.1:3000

## Endpoints

| Method | Path                                 | Auth        |
| ------ | ------------------------------------ | ----------- |
| GET    | `/health`                            | -           |
| GET    | `/docs` (Swagger UI)                 | -           |
| GET    | `/api/v1/tasks?status=&page=&limit=` | -           |
| GET    | `/api/v1/tasks/:id`                  | -           |
| POST   | `/api/v1/tasks`                      | `X-API-Key` |
| PATCH  | `/api/v1/tasks/:id`                  | `X-API-Key` |
| DELETE | `/api/v1/tasks/:id`                  | `X-API-Key` |

Errors come back as `{ "error": { "code", "message", "details", "requestId" } }`. Every response has an `X-Request-Id` header that matches the request's log line.

Tasks are stored in memory for now, so they reset when the app restarts.

## Project structure

```
src/
  server.js              entry point: config, logger, startup, graceful shutdown
  app.js                 Express app: middleware, routes, error handling
  config.js              environment validation (fails fast on bad config)
  modules/
    tasks/               routes → controller → service → repository, plus zod schemas
    health/
  shared/
    errors.js            AppError, ValidationError, UnauthorizedError, NotFoundError
    logger.js            pino
    middleware/          API key auth, validation, request logging, error handler
  docs/openapi.js        OpenAPI spec served at /docs
test/
  unit/                  service and config
  integration/           HTTP tests against the real app
```

The repository is the only layer that touches storage. Moving tasks to MySQL means adding a repository with the same async methods and passing it to `createApp` in `server.js`.

## Running locally

```bash
npm install
npm run dev     # http://127.0.0.1:3000/docs, API key is "dev-key" unless set in .env
npm test
npm run lint
npm run format
```

## Deployment

Runs on a Lightsail instance (Ubuntu 24.04) with a static IP:

- Node.js 22 from NodeSource
- PM2 runs the app from `ecosystem.config.cjs`. `pm2 startup` and `pm2 save` bring it back after a reboot
- NGINX listens on port 80 and proxies to 127.0.0.1:3000, with per-IP rate limiting
- The production `.env` (API key) exists only on the server

To deploy changes, take a Lightsail snapshot first, then:

```bash
cd ~/node-lightsail-api
git pull
npm ci --omit=dev
pm2 reload node-lightsail-api
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
