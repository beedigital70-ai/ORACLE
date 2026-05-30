const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const pool = require('../db/database');
const { getMatchOutcomes } = require('../services/sports');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  console.log('Running Grading Task: Grading outcomes...');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const pendingResult = await pool.query("SELECT * FROM daily_predictions WHERE status = 'Pending' AND date = $1", [today]);
    const pendingPicks = pendingResult.rows;
    
    if (pendingPicks.length === 0) {
      console.log('No pending picks to grade today.');
      process.exit(0);
    }

    const matchIds = pendingPicks.map(p => p.match_id);
    const outcomes = await getMatchOutcomes(matchIds);

    let winsToday = 0;
    let lossesToday = 0;

    for (const pick of pendingPicks) {
      const outcome = outcomes.find(o => o.fixture.id.toString() === pick.match_id.toString());
      if (outcome && outcome.fixture.status.short === 'FT') {
        const { GoogleGenAI } = require('@google/genai');
        const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
        
        let status = 'Pending';
        if (ai) {
           const gradePrompt = `
              Did the following prediction WIN or LOSE based on the match outcome?
              Prediction Market Line: ${pick.market_line}
              Match Data & Final Score: ${JSON.stringify(outcome)}
              Respond with EXACTLY ONE WORD: either "Won" or "Lost"
            `;
           try {
              const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: gradePrompt
              });
              const text = response.text.trim();
              if (text.includes('Won')) status = 'Won';
              else if (text.includes('Lost')) status = 'Lost';
           } catch(e) {
              console.error("Grading AI Error", e);
           }
           await delay(4500); // Rate limit
        }

        if (status !== 'Pending') {
          await pool.query("UPDATE daily_predictions SET status = $1 WHERE id = $2", [status, pick.id]);
          if (status === 'Won') winsToday++;
          if (status === 'Lost') lossesToday++;
        }
      }
    }

    const profitLossUnits = winsToday - lossesToday;
    await pool.query(`
      UPDATE performance_history 
      SET wins = wins + $1, losses = losses + $2, profit_loss_units = profit_loss_units + $3 
      WHERE date = $4
    `, [winsToday, lossesToday, profitLossUnits, today]);
    
    // Evaluate Slips
    const slipsResult = await pool.query("SELECT * FROM daily_slips WHERE status = 'Pending' AND date = $1", [today]);
    for (const slip of slipsResult.rows) {
      const pickIds = JSON.parse(slip.picks_included);
      
      const pickPlaceholders = pickIds.map((_, i) => `$${i + 1}`).join(',');
      const picksRes = await pool.query(`SELECT status FROM daily_predictions WHERE id IN (${pickPlaceholders})`, pickIds);
      const picks = picksRes.rows;
      
      let slipStatus = 'Pending';
      const hasLost = picks.some(p => p.status === 'Lost');
      const allWon = picks.every(p => p.status === 'Won');
      const hasPending = picks.some(p => p.status === 'Pending');

      if (hasLost) {
        slipStatus = 'Lost';
      } else if (allWon && !hasPending && picks.length === pickIds.length) {
        slipStatus = 'Won';
      }

      if (slipStatus !== 'Pending') {
        await pool.query("UPDATE daily_slips SET status = $1 WHERE id = $2", [slipStatus, slip.id]);
        console.log(`Slip ${slip.id} marked as ${slipStatus}`);
      }
    }

    console.log('Grading Task Completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error in Grading Task:', error);
    process.exit(1);
  }
})();
