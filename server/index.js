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
const cheerio = require('cheerio');
const sources = require('./sources');
const fs = require('fs');
const path = require('path');
const { listChannels, sendMessage, botEvents } = require('../bot');

function log(message) {
  console.log(message);
  botEvents.emit('log', message);
}

const TG_SOURCES_FILE = path.join(__dirname, 'tg-sources.json');
let tgSources = [];

function loadTgSources() {
  try {
    const data = fs.readFileSync(TG_SOURCES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) tgSources = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load tg sources', e);
  }
}

function saveTgSources() {
  try {
    fs.writeFileSync(TG_SOURCES_FILE, JSON.stringify(tgSources, null, 2));
  } catch (e) {
    console.error('Failed to save tg sources', e);
  }
}

loadTgSources();

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
app.use(express.json());
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
    let htmlContent = null;
    let image = data.image || data.openGraph?.image || null;
    if (!text || text.length < 40 || !image) {
      const { extractFromHtml } = await import('@extractus/article-extractor');
      const article = await extractFromHtml(html, url);
      text = text || article?.text?.trim() || article?.content?.replace(/<[^>]+>/g, '').trim() || null;
      htmlContent = article?.content?.trim() || null;
      image = image || article?.image || null;
    } else {
      htmlContent = data.html || null;
    }
    return { text, html: htmlContent, image };
  } catch (err) {
    console.error('Error scraping', url, err.message);
    return { text: null, html: null, image: null };
  }
}

async function scrapeTelegramChannel(url) {
  const match = url.match(/t\.me(?:\/s)?\/([^/?]+)/i);
  const channel = match ? match[1] : url.replace(/^@/, '');
  const pageUrl = `https://r.jina.ai/https://t.me/s/${channel}`;
  try {
    const res = await axiosInstance.get(pageUrl, { responseType: 'text', maxRedirects: 5 });
    const lines = res.data.split(/\r?\n/);
    const posts = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/\((https:\/\/t\.me\/[^/]+\/\d+)\)/);
      if (!m) continue;
      const link = m[1];
      let image = null;
      for (let j = i - 1; j >= 0; j--) {
        const img = lines[j].match(/!\[[^\]]*\]\((https?:\/\/[^\)]+)\)/);
        if (img) { image = img[1]; break; }
        if (lines[j].trim() !== '' && !lines[j].startsWith('[')) break;
      }
      const textParts = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/\((https:\/\/t\.me\/[^/]+\/\d+)\)/)) break;
        if (lines[j].startsWith('[') && lines[j].includes('](https://t.me/')) break;
        if (/^\s*$/.test(lines[j])) { if (textParts.length) break; else continue; }
        textParts.push(lines[j].trim());
      }
      const text = textParts.join(' ').trim();
      const post = {
        url: link,
        title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
        text,
        image,
        publishedAt: null
      };
      log(`Scraped TG post: ${post.title} - ${post.url}`);
      posts.push(post);
    }
    return posts.slice(-2);
  } catch (err) {
    console.error('Error scraping telegram', url, err.message);
    return [];
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
app.get('/api/channels', (req, res) => {
  res.json(listChannels());
});

app.post('/api/post', async (req, res) => {
  try {
    const { channel, text } = req.body;
    if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });
    log(`Posting to ${channel}`);
    await sendMessage(channel, text);
    log(`Posted to ${channel}`);
    res.json({ ok: true });
  } catch (e) {
    log(`Failed posting to ${req.body.channel}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tg-sources', (req, res) => {
  res.json(tgSources);
});

app.post('/api/tg-sources', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  if (!tgSources.includes(url)) {
    tgSources.push(url);
    saveTgSources();
  }
  res.json({ ok: true });
});

app.delete('/api/tg-sources', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  const idx = tgSources.indexOf(url);
  if (idx !== -1) {
    tgSources.splice(idx, 1);
    saveTgSources();
  }
  res.json({ ok: true });
});

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
 *       - in: query
 *         name: history
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include last two items from each source on connect
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

  const logListener = (msg) => {
    res.write(`event: log\ndata: ${JSON.stringify({ message: msg })}\n\n`);
  };
  botEvents.on('log', logListener);

  const selected = req.query.sources ? req.query.sources.split(',') : [];
  const includeHistory = req.query.history !== 'false';
  const parser = new Parser();
  const seen = new Set();
  const status = new Map();
  let initial = true;

  const sendItems = async () => {
    for (const name of selected) {
      const source = sources[name];
      if (!source) continue;
      try {
        log(`Fetching ${name}`);
        const items = await source.fetch(axiosInstance, parser);
        if (status.get(name) !== 'connected') {
          res.write(`event: status\ndata: ${JSON.stringify({ source: name, status: 'connected' })}\n\n`);
          status.set(name, 'connected');
        }
        for (const item of items) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          if (!includeHistory && initial) continue;
          log(`Scraping ${item.url}`);
          const scraped = await scrapeQueue.add(() => scrapeArticle(item.url));
          item.text = scraped.text || item.text;
          item.html = scraped.html || item.html;
          item.image = scraped.image || item.image;
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
  initial = false;
  const interval = setInterval(sendItems, 60000);
  req.on('close', () => {
    clearInterval(interval);
    botEvents.off('log', logListener);
  });
});

app.get('/api/tgnews', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const logListener = (msg) => {
    res.write(`event: log\ndata: ${JSON.stringify({ message: msg })}\n\n`);
  };
  botEvents.on('log', logListener);

  const urls = req.query.urls ? req.query.urls.split(',') : tgSources;
  const includeHistory = req.query.history !== 'false';
  const seen = new Set();
  let initial = true;

  const sendItems = async () => {
    for (const url of urls) {
      try {
        log(`Scraping TG ${url}`);
        const items = await scrapeTelegramChannel(url);
        for (const item of items) {
          log(`Found post ${item.url}`);
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          if (!includeHistory && initial) continue;
          res.write(`data: ${JSON.stringify({ ...item, source: url })}\n\n`);
          log(`Sent post ${item.url}`);
        }
      } catch (err) {
        console.error('Error fetching tg source', url, err.message);
      } finally {
        res.write(`event: ping\ndata: ${JSON.stringify({ source: url, time: Date.now() })}\n\n`);
      }
    }
  };

  await sendItems();
  initial = false;
  const interval = setInterval(sendItems, 60000);
  req.on('close', () => {
    clearInterval(interval);
    botEvents.off('log', logListener);
  });
});

app.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});
