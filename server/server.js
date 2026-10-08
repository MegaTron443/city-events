const path = require('path');
const express = require('express');
const events = require('./events.json');

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

// API ендпоінт з повним списком
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(events);
});

// API ендпоінт за айді
app.get('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  const event = events.find(item => item.id === eventId);

  res.setHeader('Content-Type', 'application/json');

  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Подію з id "${eventId}" не знайдено`
    });
  }

  res.json(event);
});

// Обробка неіснуючих API ендпоінтів
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Запитаний ресурс не знайдено'
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
  });
}

module.exports = app;
