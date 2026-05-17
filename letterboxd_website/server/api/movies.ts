const PAGE_SIZE = 25;

export default defineCachedEventHandler(async (event) => {
    const query = getQuery(event);
    const admin = query.country as string;
    const afterRank = parseInt(query.afterRank as string) || 0;

    if (!admin) return { rows: [], hasMore: false };

    setHeader(
        event,
        "Cache-Control",
        "public, max-age=3600, stale-while-revalidate=86400",
    );

    const db = useDb();

    try {
        const result = await db.execute({
            sql: `
        SELECT t.id, t.name, t.rating, t.date, t.description, t.rank,
          (SELECT name FROM crew WHERE id = t.id AND role = 'Director' LIMIT 1) as director
        FROM top_movies_by_country t
        WHERE t.admin = ? COLLATE NOCASE
          AND t.rank > ?
        ORDER BY t.rank
        LIMIT ?;
      `,
            args: [admin, afterRank, PAGE_SIZE + 1],
        });

        const rows = result.rows;
        const hasMore = rows.length > PAGE_SIZE;
        return {
            rows: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
            hasMore,
        };
    } catch (err) {
        console.error(err);
        throw createError({ statusCode: 500, statusMessage: "DB Error" });
    }
}, {
    maxAge: 60 * 60,
    swr: true,
    getKey: (event) => {
        const q = getQuery(event);
        const admin = ((q.country as string) || "").toLowerCase();
        const afterRank = parseInt(q.afterRank as string) || 0;
        return `movies:${admin}:${afterRank}`;
    },
});
