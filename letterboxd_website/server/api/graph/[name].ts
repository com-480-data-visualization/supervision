export default defineCachedEventHandler(async (event) => {
    const name = decodeURIComponent(getRouterParam(event, 'name') || '')
    if (!name) throw createError({ statusCode: 400 })

    const db = useDb()

    const centerSQL = `SELECT id FROM actors WHERE name = ? UNION SELECT id FROM crew WHERE name = ? AND role = 'Director'`

    const totalRes = await db.execute({ sql: centerSQL, args: [name, name] })
    if (!totalRes.rows.length) throw createError({ statusCode: 404 })

    const [coActorsRes, coDirectorsRes, centerFilmsRes] = await Promise.all([
        db.execute({
            sql: `SELECT name, COUNT(*) as count FROM actors WHERE id IN (${centerSQL}) AND name != ? GROUP BY name ORDER BY count DESC LIMIT 10`,
            args: [name, name, name],
        }),
        db.execute({
            sql: `SELECT name, COUNT(*) as count FROM crew WHERE id IN (${centerSQL}) AND role = 'Director' AND name != ? GROUP BY name ORDER BY count DESC LIMIT 4`,
            args: [name, name, name],
        }),
        db.execute({
            sql: `SELECT m.id, m.name, m.date, p.link as poster FROM movies m LEFT JOIN posters p ON m.id = p.id WHERE m.id IN (${centerSQL}) ORDER BY m.rating DESC LIMIT 12`,
            args: [name, name],
        }),
    ])

    const slugify = (n: string) => n.toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const toFilm = (row: any) => ({
        id: row.id,
        name: row.name,
        year: row.date ? Math.trunc(Number(row.date)) : null,
        poster: row.poster || null,
    })

    async function getSharedFilms(personName: string, isDirector: boolean) {
        const personSQL = isDirector
            ? `SELECT id FROM crew WHERE name = ? AND role = 'Director'`
            : `SELECT id FROM actors WHERE name = ?`
        const res = await db.execute({
            sql: `SELECT m.id, m.name, m.date, p.link as poster FROM movies m LEFT JOIN posters p ON m.id = p.id WHERE m.id IN (${personSQL}) AND m.id IN (${centerSQL}) ORDER BY m.rating DESC LIMIT 8`,
            args: [personName, name, name],
        })
        return res.rows.map(toFilm)
    }

    const [actorFilms, directorFilms] = await Promise.all([
        Promise.all(coActorsRes.rows.map(r => getSharedFilms(String(r.name), false))),
        Promise.all(coDirectorsRes.rows.map(r => getSharedFilms(String(r.name), true))),
    ])

    const centerId = slugify(name)

    const nodes = [
        { id: centerId, name, role: 'center', sharedFilms: null, films: centerFilmsRes.rows.map(toFilm) },
        ...coActorsRes.rows.map((r, i) => ({
            id: slugify(String(r.name)), name: r.name, role: 'actor',
            sharedFilms: Number(r.count), films: actorFilms[i],
        })),
        ...coDirectorsRes.rows.map((r, i) => ({
            id: slugify(String(r.name)), name: r.name, role: 'director',
            sharedFilms: Number(r.count), films: directorFilms[i],
        })),
    ]

    const links = nodes
        .filter(n => n.role !== 'center')
        .map(n => ({ source: centerId, target: n.id }))

    return {
        meta: { target: name, totalFilms: totalRes.rows.length },
        nodes,
        links,
    }
}, {
    maxAge: 60 * 60,
    swr: true,
    getKey: (event) => `graph:${decodeURIComponent(getRouterParam(event, 'name') || '')}`,
})
