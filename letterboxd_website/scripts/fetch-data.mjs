// Downloads a pre-built SQLite database (data/local.db) from a public URL.
// Default URL targets the "latest" GitHub Release asset of this repository,
// so anyone with repo access can hydrate their local DB without needing the
// raw CSVs or any credentials.
//
// Override with the DB_DOWNLOAD_URL env var (e.g. point at a specific tag
// while testing a schema change before promoting it to latest).

import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const dbPath = resolve(packageRoot, 'data', 'local.db')
const tmpPath = `${dbPath}.partial`

// Pin to the `latest` *tag* explicitly. The /releases/latest/ alias would
// only work for non-prerelease releases; pinning to the tag works either way
// and lets the maintainer keep replacing the asset on the same release.
const DEFAULT_URL =
  'https://github.com/com-480-data-visualization/supervision/releases/download/latest/letterboxd.db.gz'

const url = process.env.DB_DOWNLOAD_URL?.trim() || DEFAULT_URL

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  console.log(`Downloading ${url}`)
  await mkdir(dirname(dbPath), { recursive: true })

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) {
    await res.body?.cancel?.()
    if (res.status === 404) {
      console.error(
        `HTTP 404. No release asset at ${url}.\n` +
          'Likely cause: the maintainer has not published a DB snapshot yet.\n' +
          'Maintainer: run `npm run db:publish` (needs `gh` CLI authenticated).',
      )
    } else {
      console.error(`HTTP ${res.status} ${res.statusText}`)
    }
    process.exit(1)
  }

  const total = Number(res.headers.get('content-length') || 0)
  let received = 0
  let lastLog = 0

  const progress = new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength
      const now = Date.now()
      if (now - lastLog > 200) {
        const pct = total ? ` (${((received / total) * 100).toFixed(1)}%)` : ''
        process.stdout.write(`\r  ${formatBytes(received)}${pct}    `)
        lastLog = now
      }
      controller.enqueue(chunk)
    },
  })

  const stream = Readable.fromWeb(res.body.pipeThrough(progress))

  await rm(tmpPath, { force: true })
  await pipeline(stream, createGunzip(), createWriteStream(tmpPath))
  await rm(dbPath, { force: true })
  await rm(`${dbPath}-wal`, { force: true })
  await rm(`${dbPath}-shm`, { force: true })
  await rename(tmpPath, dbPath)

  const { size } = await stat(dbPath)
  process.stdout.write('\n')
  console.log(`Wrote ${dbPath} (${formatBytes(size)})`)
}

main().catch(async (e) => {
  const isGzipError =
    e?.code === 'Z_DATA_ERROR' ||
    /incorrect header check|unknown compression/i.test(e?.message ?? '')
  if (isGzipError) {
    console.error(
      '\nThe downloaded asset is not a valid gzip file. The maintainer\n' +
        'probably uploaded the raw .db file instead of the .db.gz produced by\n' +
        '`npm run db:archive`. Tell them to re-publish with `npm run db:publish`.',
    )
  } else {
    console.error('\n', e)
  }
  await rm(tmpPath, { force: true })
  process.exit(1)
})
