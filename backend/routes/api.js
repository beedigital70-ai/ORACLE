const express = require('express');
const pool = require('../db/database');
const router = express.Router();

// Get today's predictions & slips
router.get('/predictions/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const predResult = await pool.query("SELECT * FROM daily_predictions WHERE date = $1", [today]);
    const predictions = predResult.rows;
    
    const slipResult = await pool.query("SELECT * FROM daily_slips WHERE date = $1", [today]);
    const slips = slipResult.rows.map(s => ({
      ...s,
      picks_included: JSON.parse(s.picks_included)
    }));

    res.json({ predictions, slips });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical performance
router.get('/performance', async (req, res) => {
  try {
    const histResult = await pool.query("SELECT * FROM performance_history ORDER BY date DESC LIMIT 30");
    const history = histResult.rows;
    
    // Calculate running totals
    const totalResult = await pool.query("SELECT SUM(wins) as totalwins, SUM(losses) as totallosses, SUM(profit_loss_units) as totalprofit FROM performance_history");
    const totals = totalResult.rows[0];
    
    const tWins = parseInt(totals.totalwins) || 0;
    const tLosses = parseInt(totals.totallosses) || 0;
    const tProfit = parseFloat(totals.totalprofit) || 0;

    const accuracy = tWins + tLosses > 0 
      ? ((tWins / (tWins + tLosses)) * 100).toFixed(1) 
      : 0;
      
    res.json({
      history,
      runningStats: {
        accuracy,
        totalProfit: tProfit,
        totalPicks: tWins + tLosses
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all past picks and slips
router.get('/predictions/history', async (req, res) => {
  try {
    const predResult = await pool.query("SELECT * FROM daily_predictions ORDER BY date DESC, id DESC");
    const predictions = predResult.rows;
    
    const slipResult = await pool.query("SELECT * FROM daily_slips ORDER BY date DESC, id DESC");
    const slips = slipResult.rows.map(s => ({
      ...s,
      picks_included: JSON.parse(s.picks_included)
    }));
    
    res.json({ predictions, slips });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
