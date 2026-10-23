# Digital Declutter — Full-stack starter

A redesigned responsive personal organizer with:
- Overview dashboard
- Notes (create, edit, delete, search, category filter)
- Useful links (create, edit, delete, search, category filter)
- Tasks (create, edit, delete, complete, search, filter by status, due dates and priority)
- Express API backend with JSON-file persistence

## Run locally

1. Install Node.js 18 or newer from https://nodejs.org/
2. Extract this folder.
3. Open the `digital-declutter-pro` folder in VS Code.
4. Open Terminal → New Terminal.
5. Run:

   ```bash
   npm install
   npm start
   ```

6. Open http://localhost:3000

Keep the terminal running while using the site. Do not use Live Server for this version; Express serves the frontend and API together.

## Where data is saved

The server creates `data/store.json` the first time an item is saved. Data survives browser refreshes and server restarts on the same machine, provided the `data` folder is kept.

## Important deployment note

This is a functional full-stack college-project starter, not a hardened multi-user production service. The JSON data store is suitable for a single-user demo; concurrent writes and multiple users need a proper database and authentication. For a public deployment, use a persistent disk or replace the JSON store with PostgreSQL/SQLite, add authentication, validation/rate limiting, HTTPS, backups, and environment-specific configuration. Many free hosting instances use ephemeral storage, which can erase JSON-file data after redeploy/restart.

## Project structure

- `server.js` — Express backend and REST API
- `public/index.html` — page structure
- `public/style.css` — responsive UI
- `public/script.js` — frontend interactions and API calls
- `data/store.json` — created automatically when records are saved
