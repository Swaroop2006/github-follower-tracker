
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "github_tracker",
  password: process.env.DB_PASSWORD,
  port: 5432,
});

export default pool;
