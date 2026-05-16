// Compresses data/local.db into dist/letterboxd.db.gz, ready to upload as a
// GitHub Release asset. Maintainer workflow:
//
//   1. npm run db:setup        # rebuild local.db from CSVs (or db:optimize)
//   2. npm run db:archive      # produces dist/letterboxd.db.gz
//   3. Drag the file into a new (or existing "latest") GitHub Release.

import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const dbPath = resolve(packageRoot, 'data', 'local.db')
const distDir = resolve(packageRoot, 'dist')
const archivePath = resolve(distDir, 'letterboxd.db.gz')

function formatBytes(n) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  const dbStat = await stat(dbPath).catch(() => null)
  if (!dbStat) {
    console.error(
      `No DB at ${dbPath}. Run npm run db:setup first (or db:fetch).`,
    )
    process.exit(1)
  }

  await mkdir(distDir, { recursive: true })
  await rm(archivePath, { force: true })

  console.log(`Compressing ${dbPath} (${formatBytes(dbStat.size)})...`)
  const t0 = Date.now()
  await pipeline(
    createReadStream(dbPath),
    createGzip({ level: 9 }),
    createWriteStream(archivePath),
  )
  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  const archStat = await stat(archivePath)

  console.log(
    `Wrote ${archivePath} (${formatBytes(archStat.size)}, ${dt}s, ratio ${(
      archStat.size / dbStat.size
    ).toFixed(2)}x)`,
  )
  console.log(
    'Upload this file as a GitHub Release asset (replace if reusing "latest").',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
