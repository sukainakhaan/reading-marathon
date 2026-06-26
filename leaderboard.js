const express = require('express');
const PageLog = require('../models/PageLog');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/helpers');

const router = express.Router();

// GET /api/leaderboard?limit=5 — "Pages This Week"
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  res.json({ leaderboard: PageLog.weeklyLeaderboard(limit) });
}));

module.exports = router;
