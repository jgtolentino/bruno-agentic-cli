const express = require('express');
const router = express.Router();

// gdocs routes
router.get('/', (req, res) => {
  res.json({ message: 'gdocs endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'gdocs created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'gdocs details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
