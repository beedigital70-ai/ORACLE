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
    return response.data.response || [];
  } catch (error) {
    console.error('Error fetching matches:', error.response?.data || error.message);
    return [];
  }
};

const getMatchOutcomes = async (matchIds) => {
  try {
    if (!API_KEY) return [];
    
    // Fetch today's fixtures and their statuses to find outcomes
    const today = new Date().toISOString().split('T')[0];
    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: getHeaders(),
      params: {
        date: today
      }
    });
    
    const matches = response.data.response || [];
    // Filter matches that are in our requested matchIds list and have finished
    return matches.filter(m => matchIds.includes(m.fixture.id.toString()));
  } catch (error) {
    console.error('Error fetching match outcomes:', error.response?.data || error.message);
    return [];
  }
};

module.exports = {
  getTodayMatches,
  getMatchOutcomes
};
