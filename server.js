require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'NudgeAI' });
});

app.listen(PORT, () => {
  console.log(`NudgeAI server listening on port ${PORT}`);
});
