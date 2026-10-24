# Tech context

Vite and React. No router and no component library. Scripts: `dev`, `build`, `preview`, `check`.

Run with Docker: `docker compose up --build`, then http://localhost:5173. The compose file bind-mounts the project and keeps the container's `node_modules`. `CHOKIDAR_USEPOLLING` lets Vite see files added on Windows.

`check` is `node src/route.check.js`. The package is `"type": "module"`.

Games live only in `data/`. One file is one game. Optional authoring helper: `node scripts/build-dsr.js`.
