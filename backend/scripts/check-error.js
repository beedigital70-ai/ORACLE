const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query(`SELECT * FROM daily_predictions WHERE match_id = 'ERROR'`);
    if (res.rows.length > 0) {
      console.log("CRASH LOGS FOUND:");
      res.rows.forEach(r => console.log(r.data_justification));
    } else {
      console.log("No crash logs found.");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
