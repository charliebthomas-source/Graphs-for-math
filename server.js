const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));
app.use('/data', express.static('data'));
app.use(express.json());

const SCORES_FILE = path.join(__dirname, 'data', 'scores.json');

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeScores(data) {
  fs.mkdirSync(path.dirname(SCORES_FILE), { recursive: true });
  fs.writeFileSync(SCORES_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/scores', (req, res) => {
  res.json(readScores());
});

app.post('/api/scores/:testId', (req, res) => {
  const scores = readScores();
  if (!scores[req.params.testId]) scores[req.params.testId] = [];
  scores[req.params.testId].unshift(req.body);
  if (scores[req.params.testId].length > 20) scores[req.params.testId] = scores[req.params.testId].slice(0, 20);
  writeScores(scores);
  res.json({ ok: true });
});

app.delete('/api/scores/:testId/:index', (req, res) => {
  const scores = readScores();
  const list = scores[req.params.testId] || [];
  list.splice(Number(req.params.index), 1);
  scores[req.params.testId] = list;
  writeScores(scores);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PC Dressage running on http://localhost:${PORT}`));
