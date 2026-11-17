# Socdaal Boosteejo web app

The Angular manager app. A manager signs in with phone and PIN and works on their own boosteejo; the admin switches boosteejo from the top of the sidebar. On phones the sidebar opens from the menu button.

The menu is grouped by module:

| Menu | Page | Path | What it does |
| --- | --- | --- | --- |
| | Dashboard | `/dashboard` | Buses in queue, departures and passengers today, per route |
| Boosteejo | Bus queue | `/boosteejo/queue` | Buses in order for one route; move up / down, set departure time, mark the first bus departed |
| | Register arrival | `/boosteejo/arrival` | Find a bus by plate or add a new one, then put it at the end of a route's queue |
| | Trips | `/boosteejo/trips` | Every bus that queued, by date, route or plate; opens the trip with its passengers |
| | Passengers | `/boosteejo/passengers` | Everyone registered on a day, or found by name or phone |
| | Buses | `/boosteejo/buses` | Every registered bus; add and edit |
| Dalmar | Tours, Hotels, Guides | `/dalmar/...` | Coming in Stage 3; each page says what is planned |
| Administration | User management | `/users` | Admins and managers: add, reset PIN, move to another boosteejo, block |
| | Settings › Boosteejos | `/settings/boosteejos` | Every boosteejo with location, contact and hours |
| | Settings › Routes | `/settings/routes` | The destinations each boosteejo serves |
| | Settings › Cities | `/settings/cities` | Cities and regions |

**Registering passengers:** the **Register passenger** button in the top bar works from any page. It opens a side panel where you pick the route; the boarding bus is already selected with its seats left. Type the phone number (the name fills in if they travelled before), name and seats, then register. The panel stays open for the next person in line and moves to the next bus when one is full. Each bus on the Bus queue also has its own register button.

Administration is only shown to admins. Old addresses such as `/queue` and `/admin` redirect to the new ones.

Screens are in Somali by default, with an English switch in the user menu at the bottom of the sidebar. The administration pages are in English for now. The Somali wording in `src/app/core/i18n.ts` is a first draft: have a boosteejo manager check it before the pilot.

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
