require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const Parser = require('rss-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const iconv = require('iconv-lite');
const TG_ENABLED = process.env.TG_INTEGRATION_FF === 'true';
const sources = require('./sources');
const { fetchChannelInfo } = TG_ENABLED ? require('./sources/telegram') : {};

class Queue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.tasks = [];
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.tasks.push({ fn, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.running >= this.concurrency || this.tasks.length === 0) return;
    const { fn, resolve, reject } = this.tasks.shift();
    this.running++;
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        this.running--;
        this.next();
      });
  }
}

const scrapeQueue = new Queue(2);

const app = express();
const proxyUrl = process.env.https_proxy || process.env.http_proxy || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const axiosInstance = axios.create(proxyUrl ? {
  httpAgent: new HttpProxyAgent(proxyUrl),
  httpsAgent: new HttpsProxyAgent(proxyUrl),
  proxy: false,
  maxRedirects: 10
} : { maxRedirects: 10 });
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

async function scrapeArticle(url) {
  try {
    const res = await axiosInstance.get(url, { responseType: 'arraybuffer', maxRedirects: 5 });
    const charset = res.headers['content-type']?.match(/charset=([^;]+)/i)?.[1] || 'utf8';
    const html = iconv.decode(res.data, charset);
    const { default: unfluff } = await import('unfluff');
    const data = unfluff(html);
    let text = data.text?.trim() || null;
    let image = data.image || data.openGraph?.image || null;
    if (!text || text.length < 40 || !image) {
      const { extractFromHtml } = await import('@extractus/article-extractor');
      const article = await extractFromHtml(html, url);
      text = text || article?.content?.trim() || null;
      image = image || article?.image || null;
    }
    return { text, image };
  } catch (err) {
    console.error('Error scraping', url, err.message);
    return { text: null, image: null };
  }
}

/**
 * @openapi
 * /api/telegram-info:
 *   get:
 *     summary: Get Telegram channel information
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         required: true
 *         description: Telegram channel link or username
 *     responses:
 *       200:
 *         description: Channel info
 */
if (TG_ENABLED) {
  app.get('/api/telegram-info', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: 'url required' });
      const info = await fetchChannelInfo(url);
      res.json(info);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

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
  const status = new Map();

  const sendItems = async () => {
    for (const name of selected) {
      let source = sources[name];
      let options = {};
      if (!source) {
        if (TG_ENABLED && name.startsWith('tg:')) {
          source = sources.telegram;
          options.channel = name.slice(3);
        }
      }
      if (!source) continue;
      try {
        res.write(`event: log\ndata: ${JSON.stringify({ message: `Fetching ${name}` })}\n\n`);
        const items = await source.fetch(axiosInstance, parser, options);
        if (status.get(name) !== 'connected') {
          res.write(`event: status\ndata: ${JSON.stringify({ source: name, status: 'connected' })}\n\n`);
          status.set(name, 'connected');
        }
        for (const item of items) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          if (!item.text || !item.image) {
            res.write(`event: log\ndata: ${JSON.stringify({ message: `Scraping ${item.url}` })}\n\n`);
            const scraped = await scrapeQueue.add(() => scrapeArticle(item.url));
            item.text = item.text || scraped.text;
            item.image = item.image || scraped.image;
          }
          res.write(`data: ${JSON.stringify({ ...item, source: name })}\n\n`);
        }
      } catch (err) {
        if (status.get(name) !== 'error') {
          res.write(`event: status\ndata: ${JSON.stringify({ source: name, status: 'error', message: err.message })}\n\n`);
          status.set(name, 'error');
        }
        console.error('Error fetching source', name, err.message);
      } finally {
        res.write(`event: ping\ndata: ${JSON.stringify({ source: name, time: Date.now() })}\n\n`);
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
