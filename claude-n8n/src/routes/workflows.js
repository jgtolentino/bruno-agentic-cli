const express = require('express');
const router = express.Router();

// workflows routes
router.get('/', (req, res) => {
  res.json({ message: 'workflows endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'workflows created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'workflows details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
