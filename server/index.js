const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');
const cors = require('cors');
const sources = require('./sources');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

app.get('/api/news', async (req, res) => {
  const selected = req.query.sources ? req.query.sources.split(',') : [];
  const parser = new Parser();
  let aggregated = [];
  for (const name of selected) {
    const source = sources[name];
    if (!source) continue;
    try {
      const items = await source.fetch(axios, parser);
      aggregated = aggregated.concat(items.map(item => ({ ...item, source: name })));
    } catch (err) {
      console.error('Error fetching source', name, err.message);
    }
  }
  res.json(aggregated);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
