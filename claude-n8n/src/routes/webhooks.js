const express = require('express');
const router = express.Router();

// webhooks routes
router.get('/', (req, res) => {
  res.json({ message: 'webhooks endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: 'webhooks created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'webhooks details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
