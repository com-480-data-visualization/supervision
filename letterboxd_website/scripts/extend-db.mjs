import { createClient } from '@libsql/client';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const dataDir = resolve(packageRoot, 'data');
const dbPath = resolve(dataDir, 'local.db');

const TABLES = [
  {
    name: 'posters',
    csv: resolve(dataDir, 'posters.csv'),
    ddl: `CREATE TABLE IF NOT EXISTS posters (id INTEGER, link TEXT)`,
    insert: 'INSERT INTO posters (id, link) VALUES (?, ?)',
    columns: [
      ['id', 'int'],
      ['link', 'text'],
    ],
  },
  {
    name: 'actors',
    csv: resolve(dataDir, 'actors.csv'),
    ddl: `CREATE TABLE IF NOT EXISTS actors (id INTEGER, name TEXT)`,
    insert: 'INSERT INTO actors (id, name) VALUES (?, ?)',
    columns: [
      ['id', 'int'],
      ['name', 'text'],
    ],
  },
  {
    name: 'crew',
    csv: resolve(dataDir, 'crew.csv'),
    ddl: `CREATE TABLE IF NOT EXISTS crew (id INTEGER, name TEXT, role TEXT)`,
    insert: 'INSERT INTO crew (id, name, role) VALUES (?, ?, ?)',
    columns: [
      ['id', 'int'],
      ['name', 'text'],
      ['role', 'text'],
    ],
  },
];

const POST_DDL = [
  `CREATE INDEX IF NOT EXISTS idx_posters_id ON posters(id)`,
  `CREATE INDEX IF NOT EXISTS idx_actors_id ON actors(id)`,
  `CREATE INDEX IF NOT EXISTS idx_crew_id_role ON crew(id, role)`,
];

const BATCH_SIZE = 5000;

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function coerce(value, type) {
  if (value === '' || value == null) return null;
  if (type === 'int') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return value;
}

async function* readCSV(path) {
  const stream = createReadStream(path, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (!header) {
      header = fields;
      continue;
    }
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = fields[i];
    yield row;
  }
}

async function loadTable(db, cfg) {
  const csvExists = await stat(cfg.csv).catch(() => null);
  if (!csvExists) {
    console.error(`Missing CSV: ${cfg.csv}`);
    process.exit(1);
  }

  console.log(`Loading ${cfg.name} from ${cfg.csv}`);
  const t0 = Date.now();

  await db.execute(`DROP TABLE IF EXISTS ${cfg.name}`);
  await db.execute(cfg.ddl);

  let batch = [];
  let total = 0;

  for await (const row of readCSV(cfg.csv)) {
    const args = cfg.columns.map(([field, type]) => coerce(row[field], type));
    batch.push({ sql: cfg.insert, args });
    if (batch.length >= BATCH_SIZE) {
      await db.batch(batch, 'write');
      total += batch.length;
      batch = [];
      if (total % 100000 === 0)
        console.log(
          `  ${total.toLocaleString()} rows (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
        );
    }
  }
  if (batch.length) {
    await db.batch(batch, 'write');
    total += batch.length;
  }

  console.log(
    `  ${cfg.name}: ${total.toLocaleString()} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}

async function main() {
  const dbExists = await stat(dbPath).catch(() => null);
  if (!dbExists) {
    console.error(`No DB at ${dbPath}. Run npm run db:fetch first.`);
    process.exit(1);
  }

  const db = createClient({ url: `file:${dbPath}` });

  for (const cfg of TABLES) {
    await loadTable(db, cfg);
  }

  console.log('Building indexes...');
  for (const sql of POST_DDL) {
    const t = Date.now();
    await db.execute(sql);
    console.log(`  ${sql.match(/idx_\w+/)?.[0]}: ${Date.now() - t}ms`);
  }

  db.close();
  console.log('Done. Run npm run db:archive to package for upload.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
