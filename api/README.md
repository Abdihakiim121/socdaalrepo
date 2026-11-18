# Socdaal Boosteejo API

Backend for the first version of Socdaal Boosteejo: a manager manages the buses at a boosteejo and registers passengers.
Built with NestJS, TypeORM and MySQL. All endpoints are under `/api`.

## Setup

```bash
npm install
cp .env.example .env          # then fill in DB_*, JWT_SECRET and ADMIN_*
```

`JWT_SECRET` must be at least 32 random characters. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the MySQL database (utf8mb4 so Somali names save correctly):

```sql
CREATE DATABASE socdaal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create the tables, then the first admin (6-digit PIN) and starting cities:

```bash
npm run migration:run
npm run seed
npm run start:dev
```

The API checks its settings before starting and stops with a clear list of what's wrong. `GET /api/health` reports whether it can reach the database.

### A database made before migrations existed

If your database was created with `DB_SYNCHRONIZE=true`, it already has tables, and the first migration would fail with "table already exists". The tables also changed slightly (timestamps are now set by the API). With test data only, recreate it:

```sql
DROP DATABASE socdaaldb;
CREATE DATABASE socdaaldb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

then run `npm run migration:run` and `npm run seed` as above.

## Changing the database

Tables are only changed through migrations in `src/migrations/`. Keep `DB_SYNCHRONIZE=false`; it is refused in production.

1. Change an entity in `src/entities/`.
2. `npm run migration:generate` writes `src/migrations/<timestamp>-Migration.ts`. Rename it to say what changed, and read it.
3. `npm run migration:run` applies it. `npm run migration:revert` undoes the last one.
4. Commit the migration with the entity change. CI fails a pull request whose entities and migrations don't match, and prints the missing migration in its log.

On the server, after building: `npm run migration:run:prod`.

## Checks on every pull request

GitHub Actions (`.github/workflows/ci.yml`) builds the API and the web app, runs the migrations on an empty MySQL 8 database, and runs `scripts/smoke.sh`: an end-to-end test of the main flow against the real API (sign-in, boosteejo, route, buses, queue order, seat limits, departures, manager access, blocking, PIN limits).

## Sign-in rules

- PINs for new users are 6 digits. Existing 4- and 5-digit PINs still work until they are reset.
- After 5 wrong PINs for a phone number, or 30 from one network address, sign-in is refused for up to 15 minutes.
- Blocking a user, or moving a manager to another boosteejo, applies within seconds and closes their live connection.
- Sign-in lasts 7 days (`JWT_EXPIRES_IN`). Behind Nginx, set `TRUST_PROXY=true` so the PIN limit sees real addresses.

## How the data fits together

- **cities**: Mogadishu, Garoowe, Kismaayo…
- **stations**: every boosteejo. A city has many (Mogadishu's Garoowe boosteejo, its Kismaayo boosteejo…).
- **routes**: the destinations each boosteejo serves. The origin is the boosteejo's city.
- **users**: the admin (you) and managers. A manager belongs to one boosteejo and only sees its data.
- **buses**: registered once, can queue at any boosteejo, but only in one queue at a time.
- **trips**: one bus on one route. The queue is a route's trips with status `waiting` or `boarding`, ordered by `queuePosition`. The first one is always `boarding`.
- **passengers**: a booking on a trip. Seat limits are checked inside a database lock, so two devices can't overbook a bus.

Departed and cancelled trips are locked. Only the admin can reopen one or cancel a passenger on it.

## Endpoints

Send `Authorization: Bearer <token>` on every call except login.

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| POST | /api/auth/login | anyone | `{ phone, pin }` → `{ token, user }` |
| GET | /api/auth/me | signed in | The signed-in user and their boosteejo |
| GET | /api/health | anyone | `{ status, database }`; 503 when the database is unreachable |
| GET | /api/cities | signed in | All cities |
| POST | /api/cities | admin | `{ name, region? }` |
| PATCH | /api/cities/:id | admin | Edit a city |
| GET | /api/stations?cityId=&destinationCityId= | signed in | Boosteejos, with the routes they serve. Both filters together = "which boosteejo in Mogadishu goes to Garoowe?" |
| GET | /api/stations/:id | signed in | One boosteejo with its routes |
| POST | /api/stations | admin | `{ cityId, name, district?, landmark?, latitude?, longitude?, contactName?, contactPhone?, openingHours? }` |
| PATCH | /api/stations/:id | admin | Edit a boosteejo, or `{ active: false }` to hide it |
| GET | /api/stations/:id/routes | signed in | Routes a boosteejo serves |
| POST | /api/stations/:id/routes | admin | `{ destinationCityId }` |
| PATCH | /api/routes/:id | admin | `{ active }` |
| GET | /api/stations/:id/today | manager of it, admin | Buses in queue, departed today and passengers today, per route |
| GET | /api/users?stationId= | admin | Manager accounts |
| POST | /api/users | admin | `{ name, phone, pin, role, stationId? }` (stationId required for managers) |
| PATCH | /api/users/:id | admin | Edit, move to another boosteejo, reset PIN, or `{ active: false }` |
| GET | /api/buses?plate= | signed in | Find buses by plate |
| POST | /api/buses | signed in | `{ plate, seatCount, type?, ownerName?, ownerPhone? }` |
| PATCH | /api/buses/:id | signed in | Edit a bus |
| GET | /api/routes/:id/queue | manager of it, admin | The queue for one route, with seats booked and left |
| POST | /api/trips | manager of it, admin | A bus arrives: `{ routeId, busId, driverName?, driverPhone?, departureTime? }`; joins the end of the queue |
| GET | /api/trips?date=&routeId=&plate=&stationId= | signed in | Records search; managers only get their boosteejo |
| GET | /api/trips/:id | manager of it, admin | One trip with seats booked and left |
| PATCH | /api/trips/:id | manager of it, admin | `{ driverName?, driverPhone?, departureTime? }` |
| POST | /api/trips/:id/move | manager of it, admin | `{ direction: "up" \| "down" }`; returns the new queue |
| POST | /api/trips/:id/depart | manager of it, admin | Bus leaves; next bus starts boarding |
| POST | /api/trips/:id/cancel | manager of it, admin | Remove a bus with no passengers from the queue |
| POST | /api/trips/:id/reopen | admin | Put a departed or cancelled trip back at the front |
| GET | /api/trips/:id/passengers | manager of it, admin | Passenger list |
| POST | /api/trips/:id/passengers | manager of it, admin | `{ name, phone, seats }`; refused if the bus is full |
| POST | /api/passengers/:id/cancel | manager of it, admin | Cancel a passenger |
| GET | /api/passengers?date=&q=&routeId=&stationId= | signed in | Passengers registered on a day (default today), or matching a name or phone; managers only get their boosteejo |

Phone numbers are stored without `+252` or a leading 0, so `+252 61 234 5678` and `0612345678` match.
Bus plates are stored in capitals with single spaces.

## Live updates

The Angular app connects with Socket.IO, passing the login token:

```ts
const socket = io(environment.apiUrl, { auth: { token } });
socket.on('queue.updated', ({ stationId, routeId }) => reloadQueue(routeId));
socket.on('passengers.updated', ({ tripId }) => reloadPassengers(tripId));
```

Managers receive events for their own boosteejo; the admin receives all.

## Not built yet

Payments, daily cash reports, SMS, audit log, online booking (Stage 2) and Dalmar (Stage 3).
The data model leaves room for each; for payments, add fare and payment columns to `passengers`.
