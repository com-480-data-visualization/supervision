# Letterboxd Website

Nuxt app that visualises the Letterboxd dataset (~941K films) as a 3D globe and an actor graph.

## Setup

```bash
npm install
```

## Database

The site reads from a SQLite file at `data/local.db`. There are two ways to populate it.

### Path A — Download the pre-built DB

The repo contains an already-seeded DB as a GitHub Release asset. To hydrate your local copy:

```bash
npm install
npm run db:fetch
npm run dev
```

`db:fetch` downloads the asset from the URL hard-coded in `scripts/fetch-data.mjs` (a `DB_DOWNLOAD_URL` env var overrides it), gunzips it, and writes `data/local.db`. ~130 MB download, no credentials needed.

### Path B — Rebuild from CSVs

Use this when you have the raw dataset CSVs and want to change the schema or refresh the data.

1. Put the CSVs at `letterboxd_website/data/`:
   - `movies.csv` (`id, name, date, tagline, description, minute, rating`)
   - `countries.csv` (`id, country`)
2. Run:

   ```bash
   npm run db:setup
   ```

`db:setup` drops + recreates the tables, loads the CSVs, populates `countries.admin` from the geojson + a small alias dictionary in `scripts/lib/optimizations.mjs`, builds the indexes and the pre-aggregated `top_movies_by_country` table (top 100 rated films per country). ~1 minute end-to-end.

### Path C — Add tables to an existing DB

Use this when you already have `data/local.db` (from `db:fetch`) and want to add new tables without a full rebuild.

1. Put the relevant CSVs in `letterboxd_website/data/`.
2. Run:

   ```bash
   npm run db:extend
   ```

To add a new table, add an entry to the `TABLES` array in `scripts/extend-db.mjs` and a matching index in `POST_DDL`.

### Publishing a new pre-built DB

After running `db:setup`, package the result:

```bash
npm run db:archive
```

That creates `dist/letterboxd.db.gz` from the `data/local.db` file (~130 MB). Upload it to the `latest` GitHub Release via the web UI:

1. Open the repo's Releases page.
2. Edit the release tagged `latest` (or create it the first time and tag it `latest`).
3. Drag-and-drop `dist/letterboxd.db.gz` to replace the existing asset.
4. Save.

The `releases/download/latest/letterboxd.db.gz` URL that `db:fetch` reads keeps pointing at the most recent asset.

## Development Server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Production Build

```bash
npm run build
npm run preview
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Nuxt dev server |
| `npm run build` | Production build |
| `npm run db:fetch` | Download the pre-built SQLite DB from GitHub Releases |
| `npm run db:setup` | Rebuild `data/local.db` from CSVs (includes admin mapping + indexes + pre-agg) |
| `npm run db:archive` | Compress `data/local.db` → `dist/letterboxd.db.gz` for upload |
| `npm run db:publish` | Archive + upload the snapshot to the `latest` GitHub Release (needs `gh`) |
| `npm run db:extend` | Add actors, crew, and posters tables to an existing `data/local.db` |
