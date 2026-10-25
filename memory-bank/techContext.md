# Tech context

Vite and React. No router and no component library. Scripts: `dev`, `build`, `preview`, `check`. UI fonts: IBM Plex Sans / Condensed / Mono. Dark mode only (`color-scheme: dark`). Session state in `localStorage` key `achievement-route:v1`. Open tab in `sessionStorage` key `achievement-route:tab`.

The dev server accepts `PUT /api/games/<filename>` and writes that file under `data/` after `validateGame`. Preview does the same.

Run with Docker: `docker compose up --build`, then http://localhost:5173. The compose file bind-mounts the project and keeps the container's `node_modules`. `CHOKIDAR_USEPOLLING` lets Vite see files added on Windows.

`check` is `node src/route.check.js && node src/editGame.check.js`. The package is `"type": "module"`.

Games live only in `data/`. One file is one game. Optional authoring helper: `node scripts/build-dsr.js`. Algorithm notes: `docs/algorithm.md`.
