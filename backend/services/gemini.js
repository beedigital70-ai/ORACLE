const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Create instance without throwing immediately if key is missing, handle in function
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const MASTER_MARKET_LIST = [
  "Match Result (1X2)", "Double Chance", "Total Goals (Over/Under)", "Both Teams to Score (BTTS)", 
  "Correct Score", "Draw No Bet", "Asian Handicap", "European Handicap", "Individual Total (Team 1)", 
  "Individual Total (Team 2)", "Half Time / Full Time", "1st Half Winner", "2nd Half Winner", 
  "1st Half Totals", "2nd Half Totals", "Anytime Goalscorer", "First Goalscorer", "Last Goalscorer", 
  "Player to Score a Brace (2 Goals)", "Player to Score a Hat-trick", "Total Corners (Over/Under)", 
  "Corner Handicap", "Most Corners (1X2)", "Total Yellow Cards", "Red Card in Match (Yes/No)", 
  "Penalty Awarded (Yes/No)", "Penalty to be Scored/Missed", "Match Result + Total Goals", 
  "Match Result + BTTS", "Team to Score First", "Team to Score Last", "Time of First Goal (Intervals)", 
  "Total Fouls", "Total Offsides", "Total Shots on Target", "Total Woodwork Hits (Post/Bar)", 
  "Win to Nil", "Comeback Win", "To Win Both Halves", "To Win Either Half", "Highest Scoring Half", 
  "Clean Sheet (Team 1 or 2)", "Goals in a Row (Consecutive)", "No Team to Score 3 Goals in a Row", 
  "Own Goal to Occur", "Match to Go to Extra Time", "Match to Decided by Penalty Shootout", 
  "Outright Tournament Winner", "Top Tournament Goalscorer"
];

const analyzeMatch = async (matchData, historicalPerformance) => {
  if (!ai) {
    console.warn("GEMINI_API_KEY is missing. Skipping analysis.");
    return null;
  }

  const prompt = `
    You are an elite sports betting analyst algorithm.
    Analyze the following upcoming soccer match data:
    Match Data: ${JSON.stringify(matchData)}
    
    Using your vast internal knowledge base of global football, team strengths, tactical playstyles, and historical matchups, you must evaluate all available markets from this strict checklist:
    ${MASTER_MARKET_LIST.join(', ')}
    
    Your task is to predict EXACTLY ONE market line for this match that you consider a high-probability "Sure Pick".
    Even though real-time statistics are not provided in this prompt, rely on your deep understanding of these specific teams and leagues to make your best confident prediction.
    If it is an entirely unknown amateur league, return a JSON object with market_line as null.
    
    Respond STRICTLY in JSON format with no markdown block formatting, following this exact schema:
    {
      "market_line": "Name of the market from the list + specific pick (e.g. 'Total Goals (Over/Under) - Over 1.5'), or null",
      "confidence_rating": 88.5,
      "odds": 1.85,
      "data_justification": "Detailed statistical reason for why this hits the 85% threshold."
    }
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    const text = response.text;
    
    // Clean up potential markdown formatting from JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.market_line) return null;
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Gemini API Error:', err);
    return null;
  }
};

module.exports = {
  analyzeMatch
};
