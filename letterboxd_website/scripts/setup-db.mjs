// Rebuilds data/local.db from the Letterboxd CSV dataset and applies the
// post-seed shape the /api/movies endpoint depends on: admin column, indexes,
// top_movies_by_country pre-agg.

import { createClient } from '@libsql/client'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { mkdir, readFile, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const dataDir = resolve(packageRoot, 'data')
const dbPath = resolve(dataDir, 'local.db')
const geojsonPath = resolve(packageRoot, 'public', 'datasets', 'custom.geo.json')

const TABLES = [
  {
    name: 'movies',
    csv: resolve(dataDir, 'movies.csv'),
    ddl: `CREATE TABLE movies (
      id INTEGER,
      name TEXT,
      date REAL,
      tagline TEXT,
      description TEXT,
      minute REAL,
      rating REAL
    )`,
    insert:
      'INSERT INTO movies (id, name, date, tagline, description, minute, rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
    columns: [
      ['id', 'int'],
      ['name', 'text'],
      ['date', 'real'],
      ['tagline', 'text'],
      ['description', 'text'],
      ['minute', 'real'],
      ['rating', 'real'],
    ],
  },
  {
    name: 'countries',
    csv: resolve(dataDir, 'countries.csv'),
    ddl: `CREATE TABLE countries (
      id INTEGER,
      country TEXT,
      admin TEXT
    )`,
    insert: 'INSERT INTO countries (id, country) VALUES (?, ?)',
    columns: [
      ['id', 'int'],
      ['country', 'text'],
    ],
  },
  {
    name: 'posters',
    csv: resolve(dataDir, 'posters.csv'),
    ddl: `CREATE TABLE posters (id INTEGER, link TEXT)`,
    insert: 'INSERT INTO posters (id, link) VALUES (?, ?)',
    columns: [
      ['id', 'int'],
      ['link', 'text'],
    ],
  },
  {
    name: 'actors',
    csv: resolve(dataDir, 'actors.csv'),
    ddl: `CREATE TABLE actors (id INTEGER, name TEXT)`,
    insert: 'INSERT INTO actors (id, name) VALUES (?, ?)',
    columns: [
      ['id', 'int'],
      ['name', 'text'],
    ],
  },
  {
    name: 'crew',
    csv: resolve(dataDir, 'crew.csv'),
    ddl: `CREATE TABLE crew (id INTEGER, name TEXT, role TEXT)`,
    insert: 'INSERT INTO crew (id, name, role) VALUES (?, ?, ?)',
    columns: [
      ['id', 'int'],
      ['name', 'text'],
      ['role', 'text'],
    ],
  },
]

// Letterboxd-DB country string → Natural Earth ADMIN. Only entries where the
// names differ; identity matches are detected automatically against the
// geojson.
const EXPLICIT_ADMINS = {
  USA: 'United States of America',
  UK: 'United Kingdom',
  Serbia: 'Republic of Serbia',
  'Czech Republic': 'Czechia',
  Congo: 'Republic of the Congo',
  'Democratic Republic of Congo': 'Democratic Republic of the Congo',
  "Côte d'Ivoire": 'Ivory Coast',
  'Timor-Leste': 'East Timor',
  Bahamas: 'The Bahamas',
  Tanzania: 'United Republic of Tanzania',
  'North Macedonia': 'Macedonia',
  'Brunei Darussalam': 'Brunei',
  "Lao People's Democratic Republic": 'Laos',
  'Republic of Moldova': 'Moldova',
  'Russian Federation': 'Russia',
  'Syrian Arab Republic': 'Syria',
  'Bolivarian Republic of Venezuela': 'Venezuela',
  'State of Palestine': 'Palestine',
  Eswatini: 'Swaziland',
  'French Southern Territories': 'French Southern and Antarctic Lands',
}

const POST_SEED_DDL = [
  `CREATE INDEX IF NOT EXISTS idx_countries_admin_id
     ON countries(admin COLLATE NOCASE, id)`,
  `CREATE INDEX IF NOT EXISTS idx_movies_id
     ON movies(id)`,
  `DROP TABLE IF EXISTS top_movies_by_country`,
  `CREATE TABLE top_movies_by_country AS
     SELECT * FROM (
       SELECT
         c.admin AS admin,
         m.id, m.name, m.rating, m.date, m.description,
         ROW_NUMBER() OVER (
           PARTITION BY c.admin
           ORDER BY m.rating DESC, m.id
         ) AS rank
       FROM movies m
       JOIN countries c ON m.id = c.id
       WHERE c.admin IS NOT NULL
         AND m.rating IS NOT NULL AND m.rating > 0
     ) WHERE rank <= 100`,
  `CREATE INDEX IF NOT EXISTS idx_topmovies_admin_rank
     ON top_movies_by_country(admin COLLATE NOCASE, rank)`,
]

const BATCH_SIZE = 5000

function parseCSVLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (c === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

function coerce(value, type) {
  if (value === '' || value == null) return null
  if (type === 'int') {
    const n = Number(value)
    return Number.isFinite(n) ? Math.trunc(n) : null
  }
  if (type === 'real') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return value
}

async function* readCSV(path) {
  const stream = createReadStream(path, { encoding: 'utf8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let header = null
  for await (const line of rl) {
    if (!line) continue
    const fields = parseCSVLine(line)
    if (!header) {
      header = fields
      continue
    }
    const row = {}
    for (let i = 0; i < header.length; i++) row[header[i]] = fields[i]
    yield row
  }
}

async function loadTable(db, cfg) {
  const csvExists = await stat(cfg.csv).catch(() => null)
  if (!csvExists) {
    console.error(`Missing CSV: ${cfg.csv}`)
    process.exit(1)
  }

  console.log(`Loading ${cfg.name} from ${cfg.csv}`)
  const t0 = Date.now()

  await db.execute(`DROP TABLE IF EXISTS ${cfg.name}`)
  await db.execute(cfg.ddl)

  let batch = []
  let total = 0

  for await (const row of readCSV(cfg.csv)) {
    const args = cfg.columns.map(([field, type]) => coerce(row[field], type))
    batch.push({ sql: cfg.insert, args })
    if (batch.length >= BATCH_SIZE) {
      await db.batch(batch, 'write')
      total += batch.length
      batch = []
      if (total % 100000 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
        console.log(`  ${total.toLocaleString()} rows (${elapsed}s)`)
      }
    }
  }
  if (batch.length) {
    await db.batch(batch, 'write')
    total += batch.length
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`  ${cfg.name}: ${total.toLocaleString()} rows in ${dt}s`)
}

async function populateAdmins(db) {
  const geojson = JSON.parse(await readFile(geojsonPath, 'utf8'))
  const admins = new Set(
    geojson.features.map((f) => f?.properties?.ADMIN).filter(Boolean),
  )
  const { rows } = await db.execute(
    'SELECT DISTINCT country FROM countries WHERE country IS NOT NULL',
  )

  const updates = []
  let identity = 0
  let aliased = 0
  for (const { country } of rows) {
    let admin = null
    if (admins.has(country)) {
      admin = country
      identity++
    } else if (country in EXPLICIT_ADMINS) {
      admin = EXPLICIT_ADMINS[country]
      aliased++
    }
    if (admin) updates.push({ country, admin })
  }

  if (updates.length) {
    await db.batch(
      updates.map(({ country, admin }) => ({
        sql: 'UPDATE countries SET admin = ? WHERE country = ?',
        args: [admin, country],
      })),
      'write',
    )
  }

  return { identity, aliased, total: rows.length }
}

async function main() {
  await mkdir(dataDir, { recursive: true })
  await rm(dbPath, { force: true })
  await rm(`${dbPath}-wal`, { force: true })
  await rm(`${dbPath}-shm`, { force: true })

  console.log(`Creating SQLite DB at ${dbPath}`)
  const db = createClient({ url: `file:${dbPath}` })

  for (const cfg of TABLES) {
    await loadTable(db, cfg)
  }

  console.log('Applying optimizations...')
  const t0 = Date.now()

  console.log('  Populating countries.admin...')
  const { identity, aliased, total } = await populateAdmins(db)
  console.log(
    `    ${identity} identity + ${aliased} aliased = ${identity + aliased}/${total} countries mapped`,
  )

  for (const sql of POST_SEED_DDL) {
    const t = Date.now()
    await db.execute(sql)
    const tag =
      sql.match(/idx_\w+/)?.[0] ??
      (sql.startsWith('DROP')
        ? 'drop top_movies_by_country'
        : 'build top_movies_by_country')
    console.log(`  ${tag}: ${Date.now() - t}ms`)
  }
  console.log(`  Total: ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  db.close()
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
