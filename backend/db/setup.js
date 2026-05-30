const pool = require('./database');

const setup = async () => {
  try {
    const client = await pool.connect();
    
    // Create daily_predictions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_predictions (
        id SERIAL PRIMARY KEY,
        match_id TEXT NOT NULL,
        teams TEXT NOT NULL,
        date TEXT NOT NULL,
        market_line TEXT NOT NULL,
        confidence_rating REAL NOT NULL,
        data_justification TEXT NOT NULL,
        odds REAL DEFAULT 1.0,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create daily_slips table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_slips (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        slip_type TEXT NOT NULL,
        picks_included TEXT NOT NULL,
        total_odds REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create performance_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_history (
        id SERIAL PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        total_picks_made INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        profit_loss_units REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('PostgreSQL Database tables verified/created successfully.');
    client.release();
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
  }
};

module.exports = setup;
