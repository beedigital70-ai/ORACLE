const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query('DELETE FROM daily_predictions');
    await pool.query('DELETE FROM daily_slips');
    console.log("Successfully wiped all old hallucinated picks from the database!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
