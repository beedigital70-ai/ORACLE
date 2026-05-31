const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const res = await pool.query('SELECT * FROM daily_predictions');
    console.log("Total predictions found:", res.rowCount);
    
    const hist = await pool.query('SELECT * FROM performance_history');
    console.log("History rows:", hist.rowCount);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
