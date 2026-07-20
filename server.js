require('dotenv').config();

const express = require('express');
const cors = require('cors');
const calendarRoutes = require('./routes/calendar');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'NudgeAI' });
});

app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`NudgeAI server listening on port ${PORT}`);
});
