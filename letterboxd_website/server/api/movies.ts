export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const countryName = query.country as string;
    const offset = parseInt(query.offset as string) || 0;

    if (!countryName) return [];

    const db = useTurso();

    try {
        const result = await db.execute({
            sql: `
        SELECT m.id, m.name, m.rating, m.date, m.description
        FROM movies m
        JOIN countries c ON m.id = c.id
        WHERE LOWER(c.country) = LOWER(?)
        AND m.rating IS NOT NULL 
        AND m.rating > 0  
        AND m.rating != ''   
        AND m.rating != ' '    
        ORDER BY m.rating DESC
        LIMIT 25 OFFSET ?;
      `,
            args: [countryName, offset]
        });

        return result.rows;
    } catch (err) {
        console.error(err);
        throw createError({ statusCode: 500, statusMessage: "DB Error" });
    }
});