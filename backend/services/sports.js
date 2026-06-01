const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.SPORTS_API_KEY;

// Determine if it's a RapidAPI key (usually 50 chars, contains 'msh')
const isRapidAPI = API_KEY && API_KEY.includes('msh');

const BASE_URL = isRapidAPI 
  ? 'https://api-football-v1.p.rapidapi.com/v3'
  : 'https://v3.football.api-sports.io';

const getHeaders = () => {
  if (isRapidAPI) {
    return {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
    };
  } else {
    return {
      'x-apisports-key': API_KEY
    };
  }
};

const TARGET_LEAGUES = [
  // Major European Leagues (Winter)
  39, // Premier League
  140, // La Liga
  135, // Serie A
  78, // Bundesliga
  61, // Ligue 1
  2, // UEFA Champions League
  3, // UEFA Europa League
  
  // Summer / Active Leagues (Expanded for Daily Volume)
  253, // MLS (USA)
  255, // USL Championship (USA)
  71,  // Serie A (Brazil)
  72,  // Serie B (Brazil)
  75,  // Serie C (Brazil)
  76,  // Serie D (Brazil)
  128, // Liga Profesional (Argentina)
  129, // Primera Nacional (Argentina)
  98,  // J1 League (Japan)
  99,  // J2 League (Japan)
  100, // J3 League (Japan)
  69,  // Eliteserien (Norway)
  70,  // OBOS-ligaen (Norway)
  113, // Allsvenskan (Sweden)
  114, // Superettan (Sweden)
  244, // Veikkausliiga (Finland)
  292, // K League 1 (South Korea)
  293, // K League 2 (South Korea)
  357, // Premier Division (Ireland)
  345, // Urvalsdeild (Iceland)
  
  // International Tournaments
  4,   // Euro Championship
  9,   // Copa America
  15,  // FIFA World Cup
  21   // International Friendlies
];

const getTodayMatches = async () => {
  try {
    if (!API_KEY) {
      console.warn("SPORTS_API_KEY is missing. Check your .env file.");
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: getHeaders(),
      params: {
        date: today
      }
    });
    
    const allMatches = response.data.response || [];
    
    // Filter to only include matches from our elite target leagues
    const targetMatches = allMatches.filter(match => TARGET_LEAGUES.includes(match.league.id));
    
    return targetMatches;
  } catch (error) {
    console.error('Error fetching matches:', error.response?.data || error.message);
    return [];
  }
};

const getMatchOutcomes = async (matchIds) => {
  try {
    if (!API_KEY || !matchIds || matchIds.length === 0) return [];
    
    let outcomes = [];
    for (const matchId of matchIds) {
      // API-Sports free tier blocks 'ids' parameter, must query individually
      try {
        const response = await axios.get(`${BASE_URL}/fixtures`, {
          headers: getHeaders(),
          params: { id: matchId }
        });
        if (response.data.response && response.data.response.length > 0) {
          outcomes.push(response.data.response[0]);
        }
      } catch (err) {
        console.error(`Error fetching match ${matchId}:`, err.message);
      }
      // 1.5 second delay to avoid hitting the 10 req/min rate limit too hard
      await new Promise(res => setTimeout(res, 1500));
    }
    
    return outcomes;
  } catch (error) {
    console.error('Error fetching match outcomes:', error.message);
    return [];
  }
};

const getTeamStandings = async (leagueId, season, teamId) => {
  try {
    const response = await axios.get(`${BASE_URL}/standings`, {
      headers: getHeaders(),
      params: { league: leagueId, season: season, team: teamId }
    });
    return response.data.response[0]?.league?.standings[0]?.find(s => s.team.id === teamId) || null;
  } catch (error) {
    return null;
  }
};

const getH2H = async (h2hString) => {
  try {
    const response = await axios.get(`${BASE_URL}/fixtures/headtohead`, {
      headers: getHeaders(),
      params: { h2h: h2hString }
    });
    return response.data.response || [];
  } catch (error) {
    return null;
  }
};

module.exports = {
  getTodayMatches,
  getMatchOutcomes,
  getTeamStandings,
  getH2H
};
