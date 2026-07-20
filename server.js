require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const calendarRoutes = require('./routes/calendar');
const taskRoutes = require('./routes/tasks');
const pushRoutes = require('./routes/push');
const prescriptionRoutes = require('./routes/prescriptions');
const reminderRoutes = require('./routes/reminders');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many push requests. Please try again later.' }
});
const prescriptionUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many prescription uploads. Please try again later.' }
});

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/push', pushLimiter, pushRoutes);
app.use('/api/prescriptions/upload', prescriptionUploadLimiter);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'NudgeAI' });
});

app.use((error, req, res, next) => {
  console.error(error.message);
  if (error.name === 'MulterError') {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: error.message || 'Internal server error' });
});

startScheduler();

app.listen(PORT, () => {
  console.log(`NudgeAI server listening on port ${PORT}`);
});
