const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const axios = require('axios');
const { getTodayMatches, getTeamStandings, getH2H } = require('../services/sports');

const API_KEY = process.env.SPORTS_API_KEY;
const isRapidAPI = API_KEY && API_KEY.includes('msh');
const BASE_URL = isRapidAPI 
  ? 'https://api-football-v1.p.rapidapi.com/v3'
  : 'https://v3.football.api-sports.io';
const getHeaders = () => isRapidAPI ? { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' } : { 'x-apisports-key': API_KEY };

(async () => {
  const matches = await getTodayMatches();
  if (matches.length > 0) {
      const match = matches[0];
      console.log(`Testing match: ${match.teams.home.name} vs ${match.teams.away.name} (League: ${match.league.name}, Season: ${match.league.season})`);
      
      try {
        console.log("Fetching standings...");
        const res1 = await axios.get(`${BASE_URL}/standings`, {
          headers: getHeaders(),
          params: { league: match.league.id, season: match.league.season }
        });
        console.log("Standings Response:", JSON.stringify(res1.data, null, 2));
      } catch (e) { console.error(e.response?.data || e.message); }
      
      try {
        console.log("Fetching H2H...");
        const res2 = await axios.get(`${BASE_URL}/fixtures/headtohead`, {
          headers: getHeaders(),
          params: { h2h: `${match.teams.home.id}-${match.teams.away.id}`, last: 5 }
        });
        console.log("H2H Response:", JSON.stringify(res2.data, null, 2));
      } catch (e) { console.error(e.response?.data || e.message); }
      
  } else {
      console.log("No matches found to test.");
  }
})();
