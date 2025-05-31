const express = require('express');
const router = express.Router();

// credentials routes
router.get('/', (req, res) => {
  res.json({ message: 'credentials endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'credentials created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'credentials details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
