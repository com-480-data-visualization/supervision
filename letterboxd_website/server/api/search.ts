export default defineEventHandler(async (event) => {
  const q = ((getQuery(event).q as string) || '').trim();
  if (q.length < 2) return { movies: [] };

  const db = useDb();

  const res = await db.execute({
    sql: `SELECT t.id, t.name, t.date, t.rating, t.description, t.admin as country,
          (SELECT name FROM crew WHERE id = t.id AND role = 'Director' LIMIT 1) as director
          FROM top_movies_by_country t
          WHERE t.name LIKE ? COLLATE NOCASE
          GROUP BY t.id
          ORDER BY t.rating DESC
          LIMIT 6`,
    args: [`%${q}%`],
  });
  return { movies: res.rows };
});
