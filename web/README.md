# Socdaal Boosteejo web app

The Angular manager app. A manager signs in with phone and PIN and works on their own boosteejo; the admin can switch between boosteejos from the top bar.

| Screen | Path | What it does |
| --- | --- | --- |
| Login | `/login` | Phone number + PIN |
| Today | `/today` | Buses in queue, departures and passengers today, per route |
| Bus queue | `/queue?routeId=` | Buses in order for one route; move up / down, set departure time, mark the first bus departed |
| Register bus arrival | `/buses/arrival` | Find a bus by plate or add a new one, then put it at the end of a route's queue |
| Trip detail | `/trips/:id` | Passenger list, register and cancel passengers, seats left, mark departed |
| Records | `/records` | Trips by date, route or plate; passengers by name or phone |
| Admin | `/admin` | Cities, boosteejos (location, contact, hours), routes, manager accounts |

Screens are in Somali by default, with an English switch in the top bar. The Somali wording in `src/app/core/i18n.ts` is a first draft: have a boosteejo manager check it before the pilot.

All times are shown and entered in Mogadishu time (UTC+3).

## Run it

Start the API first (see `../api/README.md`), then:

```bash
cd web
npm install
npm start          # http://localhost:4200, talks to the API at http://localhost:3000
```

Set the API address for production in `src/environments/environment.ts`, and add the app's address to `CORS_ORIGIN` in the API's `.env`.

```bash
npm run build      # output in dist/socdaal-web/browser
```

## Live updates

`core/live.service.ts` connects to the API with Socket.IO. When another device changes the queue or passengers, the Today, Bus queue and Trip detail screens reload. A yellow bar shows when the connection is lost.
