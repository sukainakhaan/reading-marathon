const express = require('express');
const Post = require('../models/Post');
const ReadingEntry = require('../models/ReadingEntry');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, requireFields, HttpError } = require('../middleware/helpers');

const router = express.Router();

const VALID_TYPES = ['progress_update', 'quote', 'note', 'discussion'];

/**
 * GET /api/posts?type=quote&limit=20&offset=0
 * Powers the main feed and, with ?type=quote, the Quote Wall.
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { type } = req.query;
  if (type && !VALID_TYPES.includes(type)) {
    throw new HttpError(400, `type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const posts = Post.findFeed({ type, limit, offset });
  const total = type ? Post.countByType(type) : undefined;

  res.json({ posts, total });
}));

// GET /api/posts/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');
  res.json({ post });
}));

/**
 * POST /api/posts — the unified composer endpoint behind all 4 tabs:
 * type: 'progress_update' | 'quote' | 'note' | 'discussion'
 * body: { type, body, bookId?, pageNumber?, readingEntryId? }
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { type, body, bookId, pageNumber, readingEntryId } = req.body;
  requireFields(req.body, ['type', 'body']);

  if (!VALID_TYPES.includes(type)) {
    throw new HttpError(400, `type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (readingEntryId && !ReadingEntry.belongsToUser(readingEntryId, req.user.id)) {
    throw new HttpError(403, 'readingEntryId must reference one of your own reading entries.');
  }

  const post = Post.create({
    userId: req.user.id,
    type,
    body: body.trim(),
    bookId,
    pageNumber,
    readingEntryId,
  });

  User.touchStreak(req.user.id);

  res.status(201).json({ post });
}));

// DELETE /api/posts/:id — only the author can delete their own post
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const deleted = Post.delete(req.params.id, req.user.id);
  if (!deleted) throw new HttpError(404, 'Post not found or not yours to delete.');
  res.status(204).send();
}));

// --- Reactions ("♡ resonated") ---

// POST /api/posts/:id/resonate — toggle a heart on a post
router.post('/:id/resonate', requireAuth, asyncHandler(async (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');

  const already = Post.hasReacted(req.params.id, req.user.id);
  if (already) {
    Post.removeReaction(req.params.id, req.user.id);
  } else {
    Post.addReaction(req.params.id, req.user.id);
  }

  const updated = Post.findById(req.params.id);
  res.json({ post: updated, resonated: !already });
}));

// --- Comments ("💬 Discuss") ---

// GET /api/posts/:id/comments
router.get('/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');
  res.json({ comments: Post.findComments(req.params.id) });
}));

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  const { body } = req.body;
  requireFields(req.body, ['body']);

  const post = Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');

  const comment = Post.addComment(req.params.id, req.user.id, body.trim());
  res.status(201).json({ comment });
}));

// --- Saved notes ("📋 Save to notes") ---

// POST /api/posts/:id/save
router.post('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  const post = Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');

  Post.saveForUser(req.user.id, req.params.id);
  res.status(201).json({ saved: true });
}));

// DELETE /api/posts/:id/save
router.delete('/:id/save', requireAuth, asyncHandler(async (req, res) => {
  Post.unsaveForUser(req.user.id, req.params.id);
  res.status(204).send();
}));

module.exports = router;
