const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const API_KEY = process.env.SPORTS_API_KEY;
const isRapidAPI = API_KEY && API_KEY.includes('msh');
const BASE_URL = isRapidAPI ? 'https://api-football-v1.p.rapidapi.com/v3' : 'https://v3.football.api-sports.io';
const getHeaders = () => isRapidAPI ? { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' } : { 'x-apisports-key': API_KEY };

(async () => {
  try {
    const response = await axios.get(`${BASE_URL}/fixtures`, {
      headers: getHeaders(),
      params: { id: 1546398 } // Single ID test
    });
    console.log("Single ID response:", JSON.stringify(response.data, null, 2));
    
    const response2 = await axios.get(`${BASE_URL}/fixtures`, {
      headers: getHeaders(),
      params: { ids: '1546398-1546399' } // Multiple IDs test
    });
    console.log("Multiple IDs response:", JSON.stringify(response2.data, null, 2));
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
})();
