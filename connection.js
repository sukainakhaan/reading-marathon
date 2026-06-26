const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'marathon.sqlite');

const db = new Database(DB_PATH);

// Sensible defaults for a small/medium app
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
