const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', require('./routes/health'));
app.use('/api/analyze', require('./routes/analyze'));

module.exports = app;