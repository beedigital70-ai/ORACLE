const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query('SELECT id, match_id, status FROM daily_predictions WHERE date = $1', ['2026-05-31']);
    console.log("Yesterday's predictions:", res.rows);
    
    const res2 = await pool.query('SELECT id, status FROM daily_slips WHERE date = $1', ['2026-05-31']);
    console.log("Yesterday's slips:", res2.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
