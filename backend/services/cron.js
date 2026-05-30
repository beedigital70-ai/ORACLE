const cron = require('node-cron');
const db = require('../db/database');
const { getTodayMatches, getMatchOutcomes } = require('./sports');
const { analyzeMatch } = require('./gemini');

const delay = ms => new Promise(res => setTimeout(res, ms));

const scheduleCrons = () => {
  // 06:00 AM Cron: Fetch matches -> AI Prediction -> Store in DB -> Build Slips
  cron.schedule('0 6 * * *', async () => {
    console.log('Running 06:00 AM Task: Ingesting daily matches and predicting...');
    try {
      const matches = await getTodayMatches();
      console.log(`Found ${matches.length} matches today.`);

      const history = db.prepare('SELECT * FROM performance_history ORDER BY id DESC LIMIT 30').all();
      const today = new Date().toISOString().split('T')[0];
      
      try {
          db.prepare('INSERT INTO performance_history (date) VALUES (?)').run(today);
      } catch (e) {}

      let todayPredictions = [];

      for (const match of matches) {
        const matchData = {
          id: match.fixture.id,
          teams: `${match.teams.home.name} vs ${match.teams.away.name}`,
          league: match.league.name,
          date: today
        };

        // Respect Gemini free-tier rate limits (15 RPM -> wait ~4.5s per request)
        await delay(4500);
        const prediction = await analyzeMatch(matchData, history);
        
        if (prediction && prediction.market_line) {
          console.log(`High confidence prediction found for match ${match.fixture.id}`);
          const odds = prediction.odds || 1.1; // fallback
          
          const info = db.prepare(`
            INSERT INTO daily_predictions (match_id, teams, date, market_line, confidence_rating, data_justification, odds, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
          `).run(
            matchData.id,
            matchData.teams,
            matchData.date,
            prediction.market_line,
            prediction.confidence_rating,
            prediction.data_justification,
            odds
          );
          
          db.prepare('UPDATE performance_history SET total_picks_made = total_picks_made + 1 WHERE date = ?').run(today);
          
          todayPredictions.push({
            id: info.lastInsertRowid,
            odds,
            confidence_rating: prediction.confidence_rating
          });
        }
      }

      // --- Accumulator Slip Building Logic ---
      if (todayPredictions.length > 0) {
        // Sort by highest confidence first
        todayPredictions.sort((a, b) => b.confidence_rating - a.confidence_rating);

        const buildSlip = (targetOdds, slipType) => {
          let currentOdds = 1.0;
          let includedIds = [];
          
          for (const pick of todayPredictions) {
            if (currentOdds >= targetOdds) break;
            currentOdds *= pick.odds;
            includedIds.push(pick.id);
          }

          if (includedIds.length > 0) {
            db.prepare(`
              INSERT INTO daily_slips (date, slip_type, picks_included, total_odds, status)
              VALUES (?, ?, ?, ?, 'Pending')
            `).run(today, slipType, JSON.stringify(includedIds), currentOdds);
            console.log(`Created ${slipType} with odds ${currentOdds.toFixed(2)}`);
          }
        };

        buildSlip(2.0, 'Sure 2 Odds');
        buildSlip(5.0, 'Sure 5 Odds');
        buildSlip(10.0, 'Sure 10 Odds');
      }

      console.log('06:00 AM Task Completed.');
    } catch (error) {
      console.error('Error in 06:00 AM Task:', error);
    }
  });

  // 23:00 PM Cron: Fetch outcomes -> Grade Predictions -> Grade Slips -> Update Stats
  cron.schedule('0 23 * * *', async () => {
    console.log('Running 23:00 PM Task: Grading outcomes...');
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const pendingPicks = db.prepare("SELECT * FROM daily_predictions WHERE status = 'Pending' AND date = ?").all(today);
      
      if (pendingPicks.length === 0) {
        console.log('No pending picks to grade today.');
        return;
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
             // Respect Gemini rate limits during grading too
             await delay(4500);
          }

          if (status !== 'Pending') {
            db.prepare("UPDATE daily_predictions SET status = ? WHERE id = ?").run(status, pick.id);
            if (status === 'Won') winsToday++;
            if (status === 'Lost') lossesToday++;
          }
        }
      }

      const profitLossUnits = winsToday - lossesToday;
      db.prepare(`
        UPDATE performance_history 
        SET wins = wins + ?, losses = losses + ?, profit_loss_units = profit_loss_units + ? 
        WHERE date = ?
      `).run(winsToday, lossesToday, profitLossUnits, today);
      
      // --- Evaluate Slips ---
      const pendingSlips = db.prepare("SELECT * FROM daily_slips WHERE status = 'Pending' AND date = ?").all(today);
      for (const slip of pendingSlips) {
        const pickIds = JSON.parse(slip.picks_included); // e.g. [1, 2, 5]
        
        // Fetch the updated statuses of these picks
        const placeholders = pickIds.map(() => '?').join(',');
        const picks = db.prepare(`SELECT status FROM daily_predictions WHERE id IN (${placeholders})`).all(pickIds);
        
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
          db.prepare("UPDATE daily_slips SET status = ? WHERE id = ?").run(slipStatus, slip.id);
          console.log(`Slip ${slip.id} (${slip.slip_type}) marked as ${slipStatus}`);
        }
      }

      console.log('23:00 PM Task Completed.');
    } catch (error) {
      console.error('Error in 23:00 PM Task:', error);
    }
  });

  console.log('Cron jobs scheduled: 06:00 AM (Ingestion) and 23:00 PM (Grading)');
};

module.exports = scheduleCrons;
