// Computed actor graph JSON for margot robbie to show capabilities in the mocked visualization

import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TOP_ACTORS = 10
const TOP_DIRECTORS = 4

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const targetName = process.argv[2] ?? 'Margot Robbie'
const outPath = resolve(repoRoot, process.argv[3] ?? 'app/data/margotRobbieGraph.json')
const actorsPath = resolve(repoRoot, 'data/actors.csv')
const crewPath = resolve(repoRoot, 'data/crew.csv')
const moviesPath = resolve(repoRoot, 'data/movies.csv')
const postersPath = resolve(repoRoot, 'data/posters.csv')

function parseCSVLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ }
      else quoted = !quoted
    } else if (c === ',' && !quoted) {
      out.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

async function* iterateCSV(path) {
  const stream = createReadStream(path, { encoding: 'utf8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  let header = null
  for await (const line of rl) {
    if (!line) continue
    const fields = parseCSVLine(line)
    if (!header) { header = fields; continue }
    const row = {}
    for (let i = 0; i < header.length; i++) row[header[i]] = fields[i]
    yield row
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseYear(date) {
  if (!date) return null
  const m = String(date).match(/\d{4}/)
  return m ? Number(m[0]) : null
}

async function build() {
  console.log(`Extracting graph for "${targetName}"...`)

  const targetMovieIds = new Set()
  for await (const row of iterateCSV(actorsPath)) {
    if (row.name === targetName) targetMovieIds.add(row.id)
  }
  console.log(`  Found ${targetMovieIds.size} film(s) featuring ${targetName}.`)
  if (targetMovieIds.size === 0) throw new Error(`No films found for "${targetName}"`)

  const coActorMovies = new Map()
  for await (const row of iterateCSV(actorsPath)) {
    if (!targetMovieIds.has(row.id)) continue
    if (row.name === targetName) continue
    let set = coActorMovies.get(row.name)
    if (!set) { set = new Set(); coActorMovies.set(row.name, set) }
    set.add(row.id)
  }
  console.log(`  Found ${coActorMovies.size} unique co-actors.`)

  const directorMovies = new Map()
  for await (const row of iterateCSV(crewPath)) {
    if (row.role !== 'Director') continue
    if (!targetMovieIds.has(row.id)) continue
    if (row.name === targetName) continue
    let set = directorMovies.get(row.name)
    if (!set) { set = new Set(); directorMovies.set(row.name, set) }
    set.add(row.id)
  }
  console.log(`  Found ${directorMovies.size} unique directors.`)

  const movieMeta = new Map()
  for await (const row of iterateCSV(moviesPath)) {
    if (!targetMovieIds.has(row.id)) continue
    movieMeta.set(row.id, {
      id: row.id,
      name: row.name,
      year: parseYear(row.date),
      poster: null,
    })
  }
  console.log(`  Loaded metadata for ${movieMeta.size} films.`)

  let postersMatched = 0
  for await (const row of iterateCSV(postersPath)) {
    const meta = movieMeta.get(row.id)
    if (!meta) continue
    meta.poster = row.link || null
    if (meta.poster) postersMatched++
  }
  console.log(`  Matched posters for ${postersMatched}/${movieMeta.size} films.`)

  const sortTop = (entries, n) =>
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)

  const directorEntries = [...directorMovies.entries()].map(([name, set]) => [name, set.size])
  const topDirectors = sortTop(directorEntries, TOP_DIRECTORS)
  const directorNames = new Set(topDirectors.map(([name]) => name))

  const actorEntries = [...coActorMovies.entries()]
    .filter(([name]) => !directorNames.has(name))
    .map(([name, set]) => [name, set.size])
  const topActors = sortTop(actorEntries, TOP_ACTORS)

  const filmsFor = (movieIdSet) =>
    [...movieIdSet]
      .map((id) => movieMeta.get(id))
      .filter(Boolean)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.name.localeCompare(b.name))

  const allTargetFilms = filmsFor(targetMovieIds)

  const nodes = [
    {
      id: slugify(targetName),
      name: targetName,
      role: 'center',
      sharedFilms: null,
      films: allTargetFilms,
    },
    ...topActors.map(([name, count]) => ({
      id: slugify(name),
      name,
      role: 'actor',
      sharedFilms: count,
      films: filmsFor(coActorMovies.get(name)),
    })),
    ...topDirectors.map(([name, count]) => ({
      id: slugify(name),
      name,
      role: 'director',
      sharedFilms: count,
      films: filmsFor(directorMovies.get(name)),
    })),
  ]

  const centerId = slugify(targetName)
  const links = nodes
    .filter((n) => n.role !== 'center')
    .map((n) => ({ source: centerId, target: n.id }))

  const output = {
    meta: {
      target: targetName,
      totalFilms: targetMovieIds.size,
      generatedAt: new Date().toISOString(),
    },
    nodes,
    links,
  }

  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${outPath}`)
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
