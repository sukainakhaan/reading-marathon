const express = require('express');
const User = require('../models/User');
const ReadingEntry = require('../models/ReadingEntry');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/helpers');

const router = express.Router();

// GET /api/users  — directory of fraternity members
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ users: User.findAll() });
}));

// GET /api/users/:id — a single member's public profile
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const user = User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ user });
}));

// GET /api/users/:id/reading-entries — what a member is/has been reading
router.get('/:id/reading-entries', requireAuth, asyncHandler(async (req, res) => {
  const user = User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ entries: ReadingEntry.findByUser(req.params.id) });
}));

module.exports = router;
