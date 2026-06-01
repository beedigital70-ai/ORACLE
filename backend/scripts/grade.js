const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const pool = require('../db/database');
const { getMatchOutcomes } = require('../services/sports');
const { gradeMatch } = require('../services/gemini');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  console.log('Running Grading Task: Checking pending predictions...');
  try {
    const pendingRes = await pool.query("SELECT * FROM daily_predictions WHERE status = 'Pending'");
    const pendingPicks = pendingRes.rows;

    if (pendingPicks.length === 0) {
      console.log('No pending predictions to grade.');
      process.exit(0);
    }

    console.log(`Found ${pendingPicks.length} pending predictions.`);
    
    // Group pending picks by date to query API-Sports efficiently
    const matchIds = pendingPicks.map(p => p.match_id);
    console.log('Querying match IDs:', matchIds);
    const outcomes = await getMatchOutcomes(matchIds);
    console.log('Outcomes fetched:', outcomes.length);
    
    for (const pick of pendingPicks) {
      const outcome = outcomes.find(o => o.fixture.id.toString() === pick.match_id);
      
      if (!outcome) {
        console.log(`Outcome not yet available for match ${pick.match_id}. Still pending.`);
        continue;
      }
      
      const isFinished = ["FT", "AET", "PEN", "ABD", "AWD", "WO"].includes(outcome.fixture.status.short);
      if (!isFinished) {
        console.log(`Match ${pick.match_id} is not finished yet (${outcome.fixture.status.short}). Still pending.`);
        continue;
      }

      console.log(`Grading match ${pick.match_id} - ${pick.market_line}...`);
      await delay(4500); // Rate Limit for Gemini
      const result = await gradeMatch(pick.market_line, outcome);
      
      if (result !== 'Pending') {
        console.log(`Result for ${pick.id}: ${result}`);
        await pool.query("UPDATE daily_predictions SET status = $1 WHERE id = $2", [result, pick.id]);
        
        // Update history stats
        const date = pick.date;
        if (result === 'Won') {
           await pool.query("UPDATE performance_history SET total_picks_won = total_picks_won + 1 WHERE date = $1", [date]);
        }
      }
    }

    // Grade Accumulators (daily_slips)
    console.log('Evaluating Daily Slips...');
    const pendingSlipsRes = await pool.query("SELECT * FROM daily_slips WHERE status = 'Pending'");
    
    for (const slip of pendingSlipsRes.rows) {
      const pickIds = typeof slip.picks_included === 'string' ? JSON.parse(slip.picks_included) : slip.picks_included;
      const picksRes = await pool.query("SELECT status FROM daily_predictions WHERE id = ANY($1::int[])", [pickIds]);
      const statuses = picksRes.rows.map(r => r.status);
      
      if (statuses.includes('Lost')) {
        await pool.query("UPDATE daily_slips SET status = 'Lost' WHERE id = $1", [slip.id]);
        console.log(`Slip ${slip.id} (${slip.slip_type}) updated to Lost.`);
      } else if (!statuses.includes('Pending') && statuses.length === pickIds.length) {
        // All picks exist and none are Pending/Lost -> Won
        await pool.query("UPDATE daily_slips SET status = 'Won' WHERE id = $1", [slip.id]);
        console.log(`Slip ${slip.id} (${slip.slip_type}) updated to Won!`);
      }
    }

    console.log('Grading Task Completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error in Grading Task:', error);
    process.exit(1);
  }
})();
