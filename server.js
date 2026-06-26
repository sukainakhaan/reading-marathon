require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Ensure the schema exists before anything tries to query it.
require('./db/migrate');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const readingEntryRoutes = require('./routes/readingEntries');
const postRoutes = require('./routes/posts');
const goalRoutes = require('./routes/goals');
const leaderboardRoutes = require('./routes/leaderboard');
const eventRoutes = require('./routes/events');
const noteRoutes = require('./routes/notes');
const dashboardRoutes = require('./routes/dashboard');

const { HttpError } = require('./middleware/helpers');

const app = express();

// --- Global middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Basic global rate limit to protect the API from abuse.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // generous ceiling; /api/auth/login has its own stricter limit
  standardHeaders: true,
  legacyHeaders: false,
}));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'The Reading Marathon by Speaking Fraternity — API' });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/reading-entries', readingEntryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- Serve the frontend from the same service ---------------------------
// This makes the whole app ONE deployable unit on ONE URL: the website and
// its API share an origin, so there is no CORS to configure and no backend
// URL to paste into the HTML by hand. Anything that is not an /api or /health
// route falls through to index.html.
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// --- 404 handler (API only) ---
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// --- Frontend fallback: any other GET returns the app shell ---
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// --- Central error handler ---
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // SQLite unique-constraint violations, etc.
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'That record already exists.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`📖 The Reading Marathon by Speaking Fraternity — API running on port ${PORT}`);
});

module.exports = app;
