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
const { marked } = require('marked');
const { telegram_scraper } = require('telegram-scraper');
const sources = require('./sources');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');
const { listChannels, sendMessage, sendPhoto, sendVideo, botEvents } = require('../bot');

function log(message) {
  console.log(message);
  botEvents.emit('log', message);
}

const TG_SOURCES_FILE = path.join(__dirname, 'tg-sources.json');
let tgSources = [];

const FILTERS_FILE = path.join(__dirname, 'filters.json');
let filters = [];

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

function loadFilters() {
  try {
    const data = fs.readFileSync(FILTERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) filters = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load filters', e);
  }
}

function saveFilters() {
  try {
    fs.writeFileSync(FILTERS_FILE, JSON.stringify(filters, null, 2));
  } catch (e) {
    console.error('Failed to save filters', e);
  }
}

loadTgSources();
loadFilters();
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

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
const upload = multer({ dest: path.join(__dirname, 'uploads') });
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

async function scrapeTelegramPost(link) {
  const single = link.includes('?') ? `${link}&single` : `${link}?single`;
  try {
    const res = await axiosInstance.get(single, { responseType: 'text', maxRedirects: 5 });
    const $ = cheerio.load(res.data);
    const textEl = $('.tgme_widget_message_text');
    const html = textEl.html() || '';
    const text = textEl.text().replace(/\s+/g, ' ').trim();
    const media = [];
    $('a.tgme_widget_message_photo_wrap, a.tgme_widget_message_video_player, video, source, img')
      .each((_, m) => {
        const mm = $(m);
        if (mm.closest('.tgme_widget_message_user').length) return;
        let url;
        if (mm.is('a')) {
          const style = mm.attr('style') || '';
          const m2 = /url\('([^']+)'\)/.exec(style);
          if (m2) url = m2[1];
        } else {
          url = mm.attr('src') || mm.attr('data-src');
        }
        if (url && !url.startsWith('data:') && !media.includes(url)) media.push(url);
      });
    const time = $('.tgme_widget_message_date time').attr('datetime') || null;
    return { text, html, media, image: media[0] || null, publishedAt: time };
  } catch (err) {
    console.error('Error scraping telegram post', link, err.message);
    return null;
  }
}

async function scrapeTelegramChannel(url) {
  const match = url.match(/t\.me(?:\/s)?\/([^/?]+)/i);
  const channel = match ? match[1] : url.replace(/^@/, '');
  try {
    const result = await telegram_scraper(channel);
    if (Array.isArray(result) && result.length) {
      const posts = result.slice(-2).map(p => {
        const media = [...(p.message_photo || []), ...(p.message_video || [])];
        const text = p.message_text || '';
        return {
          url: p.message_url,
          title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
          text,
          html: text ? marked.parse(text) : '',
          media,
          image: media[0] || null,
          publishedAt: p.datetime || null,
          channelTitle: p.user_name || channel,
          channelImage: p.user_photo || null
        };
      });
      posts.forEach(p => log(`Scraped TG post: ${p.title} - ${p.url}`));
      return posts;
    }
  } catch (err) {
    console.error('Error scraping telegram via library', channel, err.message);
  }

  const pageUrl = `https://t.me/s/${channel}`;
  try {
    const res = await axiosInstance.get(pageUrl, { responseType: 'text', maxRedirects: 5 });
    const $ = cheerio.load(res.data);
    const channelTitle = $('meta[property="og:title"]').attr('content') || channel;
    const channelImage = $('meta[property="og:image"]').attr('content') || null;
    const messages = $('.js-widget_message').filter((_, el) => !$(el).hasClass('service_message')).slice(-2);
    const posts = [];
    for (const el of messages.toArray()) {
      const postPath = $(el).attr('data-post');
      if (!postPath) return;
      const link = `https://t.me/${postPath}`;
      const textEl = $(el).find('.tgme_widget_message_text');
      const html = textEl.html() || '';
      const text = textEl.text().replace(/\s+/g, ' ').trim();
      const media = [];
      $(el)
        .find(
          'a.tgme_widget_message_photo_wrap, a.tgme_widget_message_video_player, video, source, img'
        )
        .each((_, m) => {
          const mm = $(m);
          if (mm.closest('.tgme_widget_message_user').length) return;
          let url;
          if (mm.is('a')) {
            const style = mm.attr('style') || '';
            const m2 = /url\('([^']+)'\)/.exec(style);
            if (m2) url = m2[1];
          } else {
            url = mm.attr('src') || mm.attr('data-src');
          }
          if (url && !url.startsWith('data:') && !media.includes(url)) media.push(url);
        });
      const time = $(el).find('.tgme_widget_message_date time').attr('datetime') || null;
      const post = {
        url: link,
        title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
        text,
        html,
        media,
        image: media[0] || null,
        publishedAt: time,
        channelTitle,
        channelImage
      };
      if (post.media.some(m => m.endsWith('.mp4'))) {
        try {
          const extra = await scrapeTelegramPost(link);
          if (extra && Array.isArray(extra.media) && extra.media.length) {
            post.media = extra.media;
            post.image = extra.image || post.image;
          }
        } catch (e) {
          console.error('Failed to rescrape post', link, e.message);
        }
      }
      log(`Scraped TG post: ${post.title} - ${post.url}`);
      posts.push(post);
    }
    return posts;
  } catch (err) {
    console.error('Error scraping telegram', url, err.message);
    return [];
  }
}

/**
 * @openapi
 * /api/channels:
 *   get:
 *     summary: List Telegram channels the bot has access to
 *     responses:
 *       200:
 *         description: Object containing channel information
 */
app.get('/api/channels', (req, res) => {
  res.json(listChannels());
});

app.post('/api/post', async (req, res) => {
  try {
    const { channel, text, media } = req.body;
    if (!channel) return res.status(400).json({ error: 'channel required' });
    if (!text && !media) return res.status(400).json({ error: 'text or media required' });
    log(`Posting to ${channel}`);
    if (media) {
      if (media.toLowerCase().endsWith('.mp4')) {
        await sendVideo(channel, media, text);
      } else {
        await sendPhoto(channel, media, text);
      }
    } else {
      await sendMessage(channel, text);
    }
    log(`Posted to ${channel}`);
    res.json({ ok: true });
  } catch (e) {
    log(`Failed posting to ${req.body.channel}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  const logListener = (msg) => {
    res.write(`data: ${JSON.stringify({ message: msg })}\n\n`);
  };
  botEvents.on('log', logListener);
  req.on('close', () => {
    botEvents.off('log', logListener);
  });
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

app.get('/api/filters', (req, res) => {
  res.json(filters);
});

app.post('/api/filters', upload.array('attachments'), async (req, res) => {
  try {
    const { title, model, instructions } = req.body;
    if (!title || !model || !instructions) return res.status(400).json({ error: 'missing fields' });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Creating filter ${title}`);
    const fileIds = [];
    for (const file of req.files || []) {
      const fd = new FormData();
      fd.append('file', fs.createReadStream(file.path));
      fd.append('purpose', 'assistants');
      const resp = await axiosInstance.post('https://api.openai.com/v1/files', fd, {
        headers: fd.getHeaders({ Authorization: `Bearer ${key}` })
      });
      fileIds.push(resp.data.id);
      fs.unlink(file.path, () => {});
    }
    const createResp = await axiosInstance.post('https://api.openai.com/v1/assistants', {
      name: title,
      model,
      instructions,
      tools: fileIds.length ? [{ type: 'file_search' }] : [],
      file_ids: fileIds
    }, { headers: { Authorization: `Bearer ${key}` } });
    const info = { id: createResp.data.id, title, model, instructions, file_ids: fileIds };
    filters.push(info);
    saveFilters();
    log(`Created filter ${title}`);
    res.json(info);
  } catch (e) {
    console.error('Failed to create filter', e.message);
    log(`Failed to create filter: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/filters/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    const filter = filters.find(f => f.id === id);
    if (!filter) return res.status(404).json({ error: 'not found' });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Filtering post with ${filter.title}`);
    const resp = await axiosInstance.post('https://api.openai.com/v1/chat/completions', {
      model: filter.model,
      messages: [
        { role: 'system', content: filter.instructions },
        { role: 'user', content: text }
      ]
    }, { headers: { Authorization: `Bearer ${key}` } });
    const content = resp.data.choices[0].message.content;
    const m = content.match(/(\d+(?:\.\d+)?)/);
    const score = m ? parseFloat(m[1]) : 0;
    log(`Score ${score} for post`);
    res.json({ score, content });
  } catch (e) {
    console.error('Failed to evaluate filter', e.message);
    log(`Failed to evaluate filter: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
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
