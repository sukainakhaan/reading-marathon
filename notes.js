const express = require('express');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/helpers');

const router = express.Router();

// GET /api/notes — current user's saved notes (from the "Save to notes" quote action)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ notes: Post.findSavedByUser(req.user.id) });
}));

module.exports = router;
