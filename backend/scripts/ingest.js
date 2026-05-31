const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const pool = require('../db/database');
const { getTodayMatches, getTeamStandings, getH2H } = require('../services/sports');
const { analyzeMatch } = require('../services/gemini');

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  console.log('Running Ingestion Task: Ingesting daily matches and predicting...');
  try {
    const matches = await getTodayMatches();
    console.log(`Found ${matches.length} matches today.`);

    const histResult = await pool.query('SELECT * FROM performance_history ORDER BY id DESC LIMIT 30');
    const history = histResult.rows;
    const today = new Date().toISOString().split('T')[0];
    
    try {
        await pool.query('INSERT INTO performance_history (date) VALUES ($1)', [today]);
    } catch (e) {}

    let todayPredictions = [];

    for (const match of matches) {
      console.log(`Fetching deep stats for: ${match.teams.home.name} vs ${match.teams.away.name}`);
      
      const homeTeamId = match.teams.home.id;
      const awayTeamId = match.teams.away.id;
      const leagueId = match.league.id;
      const season = match.league.season;

      // Rate limit protection for extra API calls
      await delay(1500);
      const h2h = await getH2H(`${homeTeamId}-${awayTeamId}`);

      const matchData = {
        id: match.fixture.id.toString(),
        teams: `${match.teams.home.name} vs ${match.teams.away.name}`,
        league: match.league.name,
        date: today,
        h2h_last_5: h2h ? h2h.slice(0, 5).map(h => `${h.teams.home.name} ${h.goals.home}-${h.goals.away} ${h.teams.away.name}`) : []
      };

      await delay(4500); // Rate Limit for Gemini
      const prediction = await analyzeMatch(matchData, history);
      
      if (prediction && prediction.market_line) {
        console.log(`High confidence prediction found for match ${matchData.id}`);
        const odds = prediction.odds || 1.1;
        
        const res = await pool.query(`
          INSERT INTO daily_predictions (match_id, teams, date, market_line, confidence_rating, data_justification, odds, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending') RETURNING id
        `, [matchData.id, matchData.teams, matchData.date, prediction.market_line, prediction.confidence_rating, prediction.data_justification, odds]);
        
        await pool.query('UPDATE performance_history SET total_picks_made = total_picks_made + 1 WHERE date = $1', [today]);
        
        todayPredictions.push({
          id: res.rows[0].id,
          odds,
          confidence_rating: prediction.confidence_rating
        });
      }
    }

    // Accumulator Building
    if (todayPredictions.length > 0) {
      todayPredictions.sort((a, b) => b.confidence_rating - a.confidence_rating);

      const buildSlip = async (targetOdds, slipType) => {
        let currentOdds = 1.0;
        let includedIds = [];
        
        for (const pick of todayPredictions) {
          if (currentOdds >= targetOdds) break;
          currentOdds *= pick.odds;
          includedIds.push(pick.id);
        }

        if (includedIds.length > 0) {
          await pool.query(`
            INSERT INTO daily_slips (date, slip_type, picks_included, total_odds, status)
            VALUES ($1, $2, $3, $4, 'Pending')
          `, [today, slipType, JSON.stringify(includedIds), currentOdds]);
          console.log(`Created ${slipType} with odds ${currentOdds.toFixed(2)}`);
        }
      };

      await buildSlip(2.0, 'Sure 2 Odds');
      await buildSlip(5.0, 'Sure 5 Odds');
      await buildSlip(10.0, 'Sure 10 Odds');
    }

    console.log('Ingestion Task Completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error in Ingestion Task:', error);
    process.exit(1);
  }
})();
