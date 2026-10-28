
import pool from "./db.js";

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    console.log("Database connection successful!");
    console.log("Database:", result.rows[0].database);
    console.log("Server time:", result.rows[0].time);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
