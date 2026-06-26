const express = require('express');
const Goal = require('../models/Goal');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, requireFields, HttpError } = require('../middleware/helpers');

const router = express.Router();

// GET /api/goals — current user's goal checklist
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ goals: Goal.findByUser(req.user.id) });
}));

// POST /api/goals — add a new goal
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { text, dueDate } = req.body;
  requireFields(req.body, ['text']);

  const goal = Goal.create({ userId: req.user.id, text: text.trim(), dueDate });
  res.status(201).json({ goal });
}));

// PATCH /api/goals/:id/toggle — check/uncheck a goal
router.patch('/:id/toggle', requireAuth, asyncHandler(async (req, res) => {
  const goal = Goal.toggle(req.params.id, req.user.id);
  if (!goal) throw new HttpError(404, 'Goal not found or not yours.');
  res.json({ goal });
}));

// DELETE /api/goals/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const deleted = Goal.delete(req.params.id, req.user.id);
  if (!deleted) throw new HttpError(404, 'Goal not found or not yours.');
  res.status(204).send();
}));

module.exports = router;
