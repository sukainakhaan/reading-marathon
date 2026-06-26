const express = require('express');
const Event = require('../models/Event');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, requireFields, HttpError } = require('../middleware/helpers');

const router = express.Router();

// GET /api/events — upcoming Fraternity Events (or ?all=true for the full list)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const all = req.query.all === 'true';
  res.json({ events: all ? Event.findAll() : Event.findUpcoming() });
}));

// POST /api/events — any signed-in member can schedule an event.
// (Previously admin-only, but the seed creates no admins, which made the
//  "Fraternity Events" panel impossible to populate from the UI. Opening it
//  to members is the right call for a small reading club; deletion below stays
//  restricted so events can't be wiped by just anyone.)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { title, description, eventDate } = req.body;
  requireFields(req.body, ['title', 'eventDate']);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate))) {
    throw new HttpError(400, 'eventDate must be in YYYY-MM-DD format.');
  }

  const event = Event.create({
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    eventDate,
    createdBy: req.user.id,
  });
  res.status(201).json({ event });
}));

// DELETE /api/events/:id — only the event's creator or an admin may delete it.
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const event = Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found.');

  const isOwner = event.created_by === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new HttpError(403, 'Only the event creator or an admin can delete this event.');
  }

  Event.delete(req.params.id);
  res.status(204).send();
}));

module.exports = router;
