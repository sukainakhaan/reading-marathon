const express = require('express');
const Book = require('../models/Book');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, requireFields, HttpError } = require('../middleware/helpers');

const router = express.Router();

// GET /api/books — full catalog
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ books: Book.findAll() });
}));

// GET /api/books/shelf — "The Community Shelf": everyone currently reading
router.get('/shelf', requireAuth, asyncHandler(async (req, res) => {
  res.json({ shelf: Book.shelf() });
}));

// GET /api/books/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const book = Book.findById(req.params.id);
  if (!book) throw new HttpError(404, 'Book not found.');
  res.json({ book });
}));

// POST /api/books — add a new book to the catalog (e.g. before starting it)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { title, author, totalPages, spineColor } = req.body;
  requireFields(req.body, ['title', 'totalPages']);

  if (Number(totalPages) <= 0) {
    throw new HttpError(400, 'totalPages must be a positive number.');
  }

  let book = Book.findByTitle(title);
  if (!book) {
    book = Book.create({ title, author, totalPages: Number(totalPages), spineColor });
  }

  res.status(201).json({ book });
}));

module.exports = router;
