const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_predictions'`);
    console.log("daily_predictions:", res.rows);
    
    const res2 = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'performance_history'`);
    console.log("performance_history:", res2.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
