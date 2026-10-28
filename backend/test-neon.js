
import pool from "./db.js";

try {
    const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `);

    console.log("Tables in Neon:");
    console.log(result.rows);
} catch (error) {
    console.error("Failed to list tables:", error.message);
} finally {
    await pool.end();
}
