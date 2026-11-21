# UNIRIDE UNISTAY

Campus mobility and verified student housing for Tanzanian universities. One account for rides **and** stays, built university-first around UDOM.

- **UNIRIDE** — short campus rides with verified, LATRA-licensed drivers, upfront fares and a full request → accept → en route → on-trip → completed lifecycle.
- **UNISTAY** — admin-reviewed hostels, rooms and apartments with room/bed-level availability and inquiry-first booking.
- **Admin operations** — driver and listing verification queues, user suspension, complaints, contact messages, campus management and an audit log.

The system is **full TypeScript** end to end and ships three clients that share the same REST API:

| Surface | Path | Stack |
| --- | --- | --- |
| REST API | [`backend/`](backend) | Express 4, PostgreSQL (`pg`), Zod, JWT |
| Web app | [`web/`](web) | Next.js 15 (App Router), React 19 |
| Mobile app | [`uniride_unistay_mobile/`](uniride_unistay_mobile) | Expo SDK 54, expo-router, React Native 0.81 |

## Features

**Students**
- Pick a campus once; rides, stays and pricing narrow to that university zone.
- Fare estimate before booking, live ride status, cancel, receipt and 1–5★ rating.
- Browse verified stays with real open units, inquire, withdraw, and see the host's phone/directions only after acceptance.
- In-app support complaints, notifications, profile and password management.
- Native mobile screens mirror every web student screen.

**Drivers**
- Upload licence, NIDA and vehicle insurance; register the vehicle; wait for admin verification.
- Go online/offline with heartbeats (auto-offline after 5 minutes of inactivity).
- Receive university-zone ride requests, accept, depart, start and complete trips.
- Daily/weekly/total earnings with the 12% commission split recorded in `transactions`.

**Stay owners**
- Create listings with photos, amenities, room drafts and bed-level bookable units.
- Manage photos, rooms and unit availability after approval.
- Accept or decline inquiries (acceptance creates the accommodation booking and applies the 7% success fee).
- Mark stays complete; track active vs past bookings.

**Admins**
- Dashboard metrics, verification queues and recent activity.
- Approve/reject drivers and properties with reasons; suspend/reinstate non-admin users.
- Manage complaints, contact messages, campuses (coordinates and geo radii) and review the audit log.

## Repository layout

```
uniride_unistay/
├── backend/                 Express + TypeScript API, schema, seed, uploads
│   ├── src/db/schema.sql    PostgreSQL schema
│   ├── src/db/migrate.ts    Applies schema.sql
│   ├── src/db/seed.ts       Campuses, demo users, listings and rides
│   ├── src/routes/          auth, public, rides, driver, owner, student, admin, …
│   └── uploads/             Uploaded files + seeded demo images
├── web/                     Next.js website (landing + all role dashboards)
└── uniride_unistay_mobile/  Expo app (landing, auth + all role workspaces)
```

## Prerequisites

- Node.js 20+ (Node 24 tested)
- PostgreSQL running locally on port `5432`
- Expo Go (SDK 54) or an emulator for the mobile app

## 1. Database

Create the database and point the backend at it:

```bash
createdb -U postgres uniride_unistay
```

`backend/.env` is already configured for the local instance:

```ini
DATABASE_URL=postgres://postgres:<password>@localhost:5432/uniride_unistay
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=<password>
PGDATABASE=uniride_unistay
```

Then apply the schema and seed demo data:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
```

`npm run db:reset` re-applies the schema and runs the seed (the seed skips itself if the demo admin already exists). To get a clean reseed, drop and recreate the database first. The schema itself is idempotent and safe to re-run.

## 2. Backend API

```bash
cd backend
npm run dev          # http://localhost:4000
```

Other scripts: `npm run typecheck`, `npm run build`, `npm start`.

Key environment values:

```ini
PORT=4000
JWT_SECRET=<long random string>
CORS_ORIGIN=http://localhost:3000
WEBHOOK_SECRET=
PUBLIC_API_URL=http://localhost:4000
FARE_BASE=1000
FARE_PER_KM=700
FARE_MIN=1500
COMMISSION_RATE=0.12
ACCOMMODATION_SUCCESS_FEE_RATE=0.07
DRIVER_HEARTBEAT_TIMEOUT_MINUTES=5
```

All responses use `{ "data": … }` or `{ "error": { "message", "code", "details" } }`. Authenticated routes take `Authorization: Bearer <jwt>`.

### Generic callback / webhook

`POST /api/webhooks/:provider` accepts any JSON body, logs it to the backend console and returns `{ received: true, provider, receivedAt }`. Set `WEBHOOK_SECRET` in `.env` and send it as `x-webhook-secret` (or `?token=`) to require authentication; leave it empty for open dev use.

Third-party services cannot reach `localhost`, so expose the API with a quick tunnel while developing:

```bash
cloudflared tunnel --url http://localhost:4000
# callback URL: https://<random>.trycloudflare.com/api/webhooks/<provider>
```

The trycloudflare URL changes every time the tunnel restarts; for a stable callback, use a named Cloudflare tunnel or deploy the backend behind your own HTTPS domain. A tunnel exposes the whole API publicly, so stop it when you are done.

ngrok works too (`ngrok http 4000` → `https://<random>.ngrok-free.app/api/webhooks/<provider>`), but its free plan rejects agents running through an HTTP proxy (`ERR_NGROK_9009`); start it with the proxy variables unset, e.g. `env -u HTTP_PROXY -u HTTPS_PROXY ngrok http 4000`.


## 3. Web app

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

`web/.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Scripts: `npm run build`, `npm start`, `npm run typecheck`.

Routes include the landing page (`/`), public stays (`/stays`, `/stays/[id]`), ride booking (`/rides`), auth (`/login`, `/signup`), student (`/dashboard/*`), driver (`/driver/*`), owner (`/owner/*`), admin (`/admin/*`), notifications, account and legal pages.

## 4. Mobile app

```bash
cd uniride_unistay_mobile
npm install
npm start            # starts Expo/Metro on port 8081
```

`npm start` launches Expo through `scripts/expo-start.js`, which drops any inherited `HTTP_PROXY`/`HTTPS_PROXY` variables so a stale proxy in the terminal cannot break startup (Metro needs no proxy).

The app discovers the API automatically from the Expo dev-server host (`http://<LAN-IP>:4000`); Android emulators use `http://10.0.2.2:4000` and web/iOS simulators use `http://localhost:4000`. To pin it explicitly (for example with `expo start --tunnel`, where the LAN IP is not visible), create `.env` from `.env.example`:

```ini
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

For a physical phone, the phone and computer must be on the same network and the backend must listen on `0.0.0.0` (default). Scripts: `npm start`, `npm run android`, `npm run ios`, `npm run typecheck`.

### EAS builds and OTA updates

`eas.json` builds an installable APK for the `production` profile and binds that profile to the `production` update channel. Rebuild the APK once after changing channel/update configuration; after that, JS-only fixes ship with:

```bash
npm run update                               # publishes to the production channel
npm run update -- -m "Fix login copy" --platform android
```

Use `npm run update` instead of raw `npx eas update` on this setup: Hermes bytecode generation is denied write access in the system temp folders (Windows), so `scripts/eas-update.js` keeps the compiler's temp files in `uniride_unistay_mobile/.tmp`. An update bakes the current `EXPO_PUBLIC_API_URL` into the bundle, so pin a stable API URL before publishing — an ngrok tunnel hostname will be dead later.

Mobile navigation: landing → login/signup → role workspace. Every workspace screen opens the same grouped sidebar (overview, stays/rides or driver/owner queues, inquiries, support, notifications, profile, sign-out) from the menu button, including stay details. Student, driver and owner workspaces also keep bottom tabs; admin screens are at `/admin` with sidebar links to driver verification, listing approval, users, ride log, campuses, complaints, contact messages and the audit log.

On web, students keep the same workspace sidebar on the shared `/stays`, `/stays/[id]` and `/rides` pages; guests and other roles still see the public navbar.

## Docker deployment

The repository ships a production stack — Postgres 16, the API, the Next.js web app and nginx on one origin — in [docker-compose.yml](docker-compose.yml), with images defined in `backend/Dockerfile` and `web/Dockerfile`.

```bash
cp deploy/.env.example .env      # set POSTGRES_PASSWORD, DATABASE_URL, JWT_SECRET, PUBLIC_ORIGIN
docker compose up -d --build     # http://localhost:8080 (or APP_PORT)
```

- The backend container applies `src/db/schema.sql` at startup, serves `/api` and `/uploads`, and keeps uploaded files in the `uploads` volume. Database data lives in `db_data`.
- Demo data is never seeded automatically; add it explicitly with `docker compose run --rm backend node dist/db/seed.js`.
- nginx proxies `/api` and `/uploads` to the API and everything else to Next.js, so the web build keeps `NEXT_PUBLIC_API_URL` empty and uses same-origin URLs. Set it (and rebuild) only if the API is served from a different host, e.g. `docker compose build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com web`.
- `PUBLIC_ORIGIN` is the URL users open and drives CORS plus callback links; set `CORS_ORIGIN` to a comma-separated list if more than one origin must be accepted.
- For real hosting, terminate TLS in front of port 8080 (Cloudflare, Caddy, or a load balancer) and set `PUBLIC_ORIGIN`/`APP_PORT` to the public values.
- The mobile app stays outside Docker: point `EXPO_PUBLIC_API_URL` at the same public HTTPS origin before building the APK or publishing updates.

## Demo accounts (development only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@unirideunistay.co.tz` | `Admin@1234` |
| Student | `student@udom.ac.tz` | `Student@1234` |
| Driver | `driver@uniride.co.tz` | `Driver@1234` |
| Owner | `owner@unistay.co.tz` | `Owner@1234` |

> These credentials and the seeded data exist only for local evaluation. Change every password (and `JWT_SECRET`) before any real deployment, and never commit real `.env` files or production secrets.

## Core flows

1. **Ride** — student posts a request in a campus zone → matching verified, idle drivers are notified → driver accepts (vehicle + zone checked under a row lock) → depart → start → complete (fare, 12% commission, driver earnings and ledger rows written) → student rates.
2. **Stay** — student sends an inquiry for an available bookable unit → owner accepts or declines → acceptance converts the unit to `OCCUPIED`, creates an accommodation booking with the 7% success fee, and reveals owner contact to the student → owner marks the stay complete.
3. **Verification** — driver/owner uploads documents → admin approves or rejects with a reason → notification + audit log entry; only verified drivers receive requests and only `ACTIVE` properties appear publicly.

## Privacy model

- Public property endpoints omit exact coordinates and owner contact details.
- Listings show neighbourhood/area, distance to campus and open-unit counts only.
- Driver identities are shared with the student only after a ride is accepted; owner phone/directions only after an inquiry is accepted.
- Statistics endpoints expose aggregate driver availability, never identities.

## Verification

```bash
cd backend && npm run typecheck
cd web && npm run build
cd uniride_unistay_mobile && npm run typecheck
```

Smoke-tested locally against PostgreSQL: login for all four roles, public summary/search, ride request → accept → depart → start → complete → rating, inquiry create → withdraw, and all admin read endpoints.

## Notes

- Fare constants are illustrative MVP values and must be confirmed against the LATRA fare framework before launch.
- Payments are recorded, not processed: fares are cash and the ledger stores `RECORDED` transactions.
- Uploaded files are served from `/uploads`; seeded images live in `backend/uploads/seed/`.

## 5. Deploy on Render (Docker)

The repo ships everything Render needs:

| File | Purpose |
| --- | --- |
| [`render.yaml`](render.yaml) | Blueprint: `uniride-api` + `uniride-web`, env wiring, health checks; the database is Supabase |
| [`backend/Dockerfile`](backend/Dockerfile) | Multi-stage Node 22 image (TypeScript build, prod deps only, non-dev run) |
| [`backend/docker-entrypoint.sh`](backend/docker-entrypoint.sh) | Copies seed images to `/app/uploads` and applies the schema on boot |
| [`web/Dockerfile`](web/Dockerfile) | Next.js `standalone` build, runtime image ~200 MB |

> Docker is not installed on the current dev machine, so these images were reviewed but not built locally. `render.yaml` and the Dockerfiles are the deploy contract — verify the first Render build's logs.

### Steps

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. Copy the **Session pooler** connection string (port 5432) and URL-encode the password.
2. Push the repo (including `render.yaml`) to GitHub.
3. Render Dashboard → **New → Blueprint** → select the repo → **Apply**. Render creates both web services; set `DATABASE_URL` to the Supabase pooler URL when prompted (or in the API service's Environment tab).
4. Wait for `uniride-api` to go live, then open `https://uniride-api.onrender.com/api/health` — it must return `{"data":{"status":"ok",...}}`. The API applies `schema.sql` on every boot (idempotent).
5. Open `https://uniride-web.onrender.com`.
6. **Seed once** (optional but needed for demo logins) from the backend directory: `DATABASE_URL='<pooler-url>' DATABASE_SSL=true npm run db:seed`.

### Environment

| Variable | Service | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API | **Set manually** to the Supabase session-pooler URL; not stored in `render.yaml` |
| `JWT_SECRET`, `WEBHOOK_SECRET` | API | Generated by the blueprint |
| `CORS_ORIGIN` | API | Web origin(s), comma-separated. Must match the deployed web URL |
| `PUBLIC_API_URL` | API | The API's own public URL (used for absolute links) |
| `NEXT_PUBLIC_API_URL` | Web | **Build-time**: baked into the browser bundle, so redeploy after changing it |
| `DATABASE_SSL` | API | Set `true` for Supabase (required by the pooler) |

If Render renames a service because the name is taken, update `CORS_ORIGIN`, `PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` in `render.yaml` and redeploy.

### Free-plan caveats

- Web services **spin down after ~15 minutes idle**; the next request takes ~30–60 s to wake.
- The filesystem is **ephemeral**, so uploaded images vanish on every deploy. A paid instance can attach the disk block commented in `render.yaml` at `/app/uploads`.
- No shell/one-off jobs on free; run the seed command from your machine against Supabase.

### Point the mobile app at Render

JS-only, so no rebuild is needed once the current APK is installed:

```bash
cd uniride_unistay_mobile
# set EXPO_PUBLIC_API_URL=https://uniride-api.onrender.com in .env
npm run update -- -m "Point API at Render" --platform android
```

### Build the images locally

```bash
docker build -t uniride-api ./backend
docker run --rm -p 4000:10000 -e DATABASE_URL=postgres://... -e JWT_SECRET=dev uniride-api

docker build -t uniride-web --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 ./web
docker run --rm -p 3000:10000 uniride-web
```
