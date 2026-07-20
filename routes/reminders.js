const express = require('express');
const store = require('../data/store');
const { confirmReminder } = require('../services/scheduler');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json(store.reminders);
});

router.post('/:id/confirm', (req, res) => {
  if (typeof req.params.id !== 'string' || !req.params.id.trim()) {
    return res.status(400).json({ error: 'A reminder id is required.' });
  }
  const reminder = confirmReminder(req.params.id);
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found.' });
  }

  return res.status(200).json(reminder);
});

module.exports = router;
