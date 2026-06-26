const express = require('express');
const db = require('../db/connection');
const PageLog = require('../models/PageLog');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/helpers');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Powers the hero stats row: Readers, Books Active, Pages This Week, Quotes Shared.
 */
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const readers = db.prepare(`SELECT COUNT(*) AS n FROM users`).get().n;

  const booksActive = db.prepare(`
    SELECT COUNT(*) AS n FROM reading_entries WHERE status != 'finished'
  `).get().n;

  const pagesThisWeek = PageLog.totalPagesThisWeek();

  const quotesShared = db.prepare(`
    SELECT COUNT(*) AS n FROM posts WHERE type = 'quote'
  `).get().n;

  res.json({
    readers,
    booksActive,
    pagesThisWeek,
    quotesShared,
  });
}));

module.exports = router;
