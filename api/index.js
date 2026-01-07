const app = require('../backend/server');
app.get('/api/verification', (req, res) => res.json({ verification: 'passed' }));
module.exports = app;
