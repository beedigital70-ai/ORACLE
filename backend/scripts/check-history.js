const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query('SELECT date FROM performance_history');
    console.log("Performance history dates:", res.rows.map(r => r.date));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
