const events = require('../server/events.json');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const { id } = req.query;

  if (id) {
    const event = events.find(item => item.id === id);
    if (!event) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Подію з id "${id}" не знайдено`
      });
    }
    return res.json(event);
  }

  res.json(events);
};