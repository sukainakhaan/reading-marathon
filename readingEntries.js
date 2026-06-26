const express = require('express');
const ReadingEntry = require('../models/ReadingEntry');
const PageLog = require('../models/PageLog');
const Book = require('../models/Book');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, requireFields, HttpError } = require('../middleware/helpers');

const router = express.Router();

// GET /api/reading-entries — "Member Progress" feed, newest-updated first
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  res.json({ entries: ReadingEntry.findAllWithDetails({ limit, offset }) });
}));

// GET /api/reading-entries/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const entry = ReadingEntry.findById(req.params.id);
  if (!entry) throw new HttpError(404, 'Reading entry not found.');
  res.json({ entry });
}));

// POST /api/reading-entries — start reading a book
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { bookId, marathonId } = req.body;
  requireFields(req.body, ['bookId']);

  const book = Book.findById(bookId);
  if (!book) throw new HttpError(404, 'Book not found.');

  const entry = ReadingEntry.create({ userId: req.user.id, bookId, marathonId });
  res.status(201).json({ entry });
}));

/**
 * PATCH /api/reading-entries/:id/progress
 * Body: { currentPage, pagesReadToday? }
 * Updates the running total and optionally logs a page-count for today,
 * which feeds the weekly leaderboard and the user's streak.
 */
router.patch('/:id/progress', requireAuth, asyncHandler(async (req, res) => {
  const { currentPage, pagesReadToday } = req.body;
  requireFields(req.body, ['currentPage']);

  if (!ReadingEntry.belongsToUser(req.params.id, req.user.id)) {
    throw new HttpError(403, 'You can only update your own reading entries.');
  }

  const entry = ReadingEntry.updateProgress(req.params.id, Number(currentPage));
  if (!entry) throw new HttpError(404, 'Reading entry not found.');

  let log = null;
  if (pagesReadToday && Number(pagesReadToday) > 0) {
    log = PageLog.create({
      userId: req.user.id,
      readingEntryId: entry.id,
      pagesRead: Number(pagesReadToday),
    });
    User.touchStreak(req.user.id);
  }

  res.json({ entry, log });
}));

module.exports = router;
