const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lpyrfyhfexeywrdugndo:Tri%2Bple%40b369@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query("SELECT * FROM daily_slips WHERE status = 'Pending'");
    for (const slip of res.rows) {
      const pickIds = typeof slip.picks_included === 'string' ? JSON.parse(slip.picks_included) : slip.picks_included;
      console.log('Slip ID:', slip.id);
      console.log('pickIds:', pickIds);
      
      const picksRes = await pool.query("SELECT status FROM daily_predictions WHERE match_id = ANY($1::text[])", [pickIds]);
      const statuses = picksRes.rows.map(r => r.status);
      console.log('statuses:', statuses);
      console.log('lengths match?', statuses.length === pickIds.length);
      console.log('---');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
