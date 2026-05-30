const db = require('./db/database');
const { getTodayMatches } = require('./services/sports');
const { analyzeMatch } = require('./services/gemini');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
    console.log('Running Manual Task: Ingesting daily matches and predicting...');
    try {
      // Limit to 4 matches for a quick manual test
      const matches = (await getTodayMatches()).slice(0, 4);
      console.log(`Found ${matches.length} matches today for quick test.`);

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

        // Respect Gemini free-tier rate limits (15 RPM -> wait 8s per request to be safe)
        await delay(8000);
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

      console.log('Manual Ingestion Task Completed.');
    } catch (error) {
      console.error('Error in Manual Task:', error);
    }
})();
