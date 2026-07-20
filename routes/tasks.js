const express = require('express');
const { fetchTasks } = require('../services/googleCalendar');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const tasks = await fetchTasks();
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
