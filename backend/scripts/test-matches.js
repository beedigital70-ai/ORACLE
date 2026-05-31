const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const { getTodayMatches } = require('../services/sports');

(async () => {
  const matches = await getTodayMatches();
  console.log(`Found ${matches.length} matches in TARGET_LEAGUES today.`);
  if (matches.length > 0) {
      console.log(matches.map(m => `${m.league.name}: ${m.teams.home.name} vs ${m.teams.away.name}`).join('\n'));
  }
})();
