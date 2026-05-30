const db = require('./db/database');
const today = new Date().toISOString().split('T')[0];

const picks = [
  { match_id: '991', teams: 'Real Madrid vs Barcelona', market: 'Match Winner - Real Madrid', confidence: 92.5, odds: 1.85, just: 'Real Madrid has won their last 5 home games with a 3.2 xG.' },
  { match_id: '992', teams: 'Manchester City vs Arsenal', market: 'Total Goals - Over 2.5', confidence: 89.0, odds: 1.65, just: 'Both teams have high expected goals (xG) over 2.0.' },
  { match_id: '993', teams: 'Bayern Munich vs Dortmund', market: 'Both Teams to Score - Yes', confidence: 87.5, odds: 1.55, just: 'Bayern concedes frequently at home, Dortmund is offensively strong.' },
  { match_id: '994', teams: 'PSG vs Marseille', market: 'Match Winner - PSG', confidence: 95.0, odds: 1.35, just: 'PSG is completely dominant in head-to-head fixtures.' }
];

let ids = [];
for (const p of picks) {
  const info = db.prepare("INSERT INTO daily_predictions (match_id, teams, date, market_line, confidence_rating, data_justification, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')").run(p.match_id, p.teams, today, p.market, p.confidence, p.just, p.odds);
  ids.push(info.lastInsertRowid);
}

db.prepare("INSERT INTO daily_slips (date, slip_type, picks_included, total_odds, status) VALUES (?, ?, ?, ?, 'Pending')").run(today, 'Sure 2 Odds', JSON.stringify([ids[0], ids[3]]), 1.85 * 1.35);
db.prepare("INSERT INTO daily_slips (date, slip_type, picks_included, total_odds, status) VALUES (?, ?, ?, ?, 'Pending')").run(today, 'Sure 5 Odds', JSON.stringify([ids[0], ids[1], ids[2]]), 1.85 * 1.65 * 1.55);

console.log('Mock data injected successfully.');
