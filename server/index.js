const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const sources = require('./sources');

const app = express();
app.use(cors({ origin: '*' }));
const PORT = process.env.PORT || 3001;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'News API', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }]
  },
  apis: [__filename]
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/news:
 *   get:
 *     summary: Stream news items via Server-Sent Events
 *     parameters:
 *       - in: query
 *         name: sources
 *         schema:
 *           type: string
 *         description: Comma separated list of source ids
 *     responses:
 *       200:
 *         description: SSE stream of news objects
 */
app.get('/api/news', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const selected = req.query.sources ? req.query.sources.split(',') : [];
  const parser = new Parser();
  const seen = new Set();

  const sendItems = async () => {
    for (const name of selected) {
      const source = sources[name];
      if (!source) continue;
      try {
        const items = await source.fetch(axios, parser);
        for (const item of items) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          res.write(`data: ${JSON.stringify({ ...item, source: name })}\n\n`);
        }
      } catch (err) {
        console.error('Error fetching source', name, err.message);
      }
    }
  };

  await sendItems();
  const interval = setInterval(sendItems, 60000);
  req.on('close', () => {
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
