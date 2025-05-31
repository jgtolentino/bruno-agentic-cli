const express = require('express');
const router = express.Router();

// nodes routes
router.get('/', (req, res) => {
  res.json({ message: 'nodes endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'nodes created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'nodes details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
