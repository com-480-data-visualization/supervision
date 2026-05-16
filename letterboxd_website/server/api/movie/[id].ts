export default defineCachedEventHandler(async (event) => {
    const id = Number(getRouterParam(event, 'id'))
    if (!id) throw createError({ statusCode: 400 })

    const db = useDb()

    const movieRes = await db.execute({
        sql: 'SELECT id, name, date, tagline, description, minute, rating FROM movies WHERE id = ? LIMIT 1',
        args: [id],
    })

    if (!movieRes.rows.length) throw createError({ statusCode: 404 })

    let poster = null
    let director = null
    let actors = []

    try {
        const r = await db.execute({ sql: 'SELECT link FROM posters WHERE id = ? LIMIT 1', args: [id] })
        poster = r.rows[0]?.link ?? null
    } catch {}

    try {
        const r = await db.execute({ sql: 'SELECT name FROM crew WHERE id = ? AND role = "Director" LIMIT 1', args: [id] })
        director = r.rows[0]?.name ?? null
    } catch {}

    try {
        const r = await db.execute({ sql: 'SELECT name FROM actors WHERE id = ? LIMIT 8', args: [id] })
        actors = r.rows.map(row => row.name)
    } catch {}

    return { ...movieRes.rows[0], poster, director, actors }
}, {
    maxAge: 60 * 60,
    swr: true,
    getKey: (event) => `movie:${getRouterParam(event, 'id')}`,
})
