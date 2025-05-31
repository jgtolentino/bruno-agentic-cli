const express = require('express');
const router = express.Router();

// claude routes
router.get('/', (req, res) => {
  res.json({ message: 'claude endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'claude created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'claude details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
