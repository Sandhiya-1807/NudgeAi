const express = require('express');
const { fetchUpcomingEvents } = require('../services/googleCalendar');

const router = express.Router();

router.get('/events', async (req, res, next) => {
  try {
    const events = await fetchUpcomingEvents();
    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
