const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cheerio = require('cheerio');
const { marked } = require('marked');
const { telegram_scraper } = require('telegram-scraper');
const fs = require('fs');
const multer = require('multer');
let listChannels,
    listInstanceChannels,
    addChannel,
    sendMessage,
    sendPhoto,
    sendVideo,
    botEvents,
    resolveLink,
    sendApprovalRequest,
    answerCallback,
    deleteMessage;

try {
  ({
    listChannels,
    listInstanceChannels,
    addChannel,
    sendMessage,
    sendPhoto,
    sendVideo,
    botEvents,
    resolveLink,
    sendApprovalRequest,
    answerCallback,
    deleteMessage
  } = require('../bot'));
} catch (e) {
  console.log('Bot disabled:', e.message);
  const { EventEmitter } = require('events');
  botEvents = new EventEmitter();
  const stub = async () => {
    throw new Error('bot disabled');
  };
  listChannels = () => ({ });
  listInstanceChannels = () => ({ });
  addChannel = stub;
  sendMessage = stub;
  sendPhoto = stub;
  sendVideo = stub;
  resolveLink = stub;
  sendApprovalRequest = stub;
  answerCallback = stub;
  deleteMessage = stub;
}
const { OpenAI, toFile } = require('openai');
const { ProxyAgent } = require('undici');
const JWT_SECRET = process.env.JWT_SECRET || 'tgnews-secret';
const DEFAULT_IMAGE_MODEL = 'dall-e-3';
const DEFAULT_IMAGE_PROMPT = 'Create an image for a Telegram post based on the following text: {postText}. The image should have a stylish, minimalistic design with modern, fashionable gradients.';
const DEFAULT_IMAGE_QUALITY = 'medium';
const DEFAULT_IMAGE_SIZE = '1024x1024';
const IMAGE_QUALITIES = ['low', 'medium', 'high'];
const IMAGE_SIZES = ['1024x1024', '1024x1536', '1536x1024'];
const DALL_E2_SIZES = ['256x256', '512x512', '1024x1024'];
const DEFAULT_POST_SUFFIX = '';

const INSTANCES_FILE = path.join(__dirname, 'instances.json');
let instances = [];

// Keep track of posts we've already scraped to avoid logging duplicates
const scrapedPostUrls = new Set();

function log(message, instanceId) {
  const prefix = instanceId ? `[${instanceId}] ` : '';
  console.log(prefix + message);
  botEvents.emit('log', { message, instanceId });
}

const TG_SOURCES_FILE = path.join(__dirname, 'tg-sources.json');
let tgSources = [];

const FILTERS_FILE = path.join(__dirname, 'filters.json');
let filters = [];

const AUTHORS_FILE = path.join(__dirname, 'authors.json');
let authors = [];

const APPROVERS_FILE = path.join(__dirname, 'approvers.json');
// list of allowed approver usernames in lower case
let approvers = [];
const awaitingPosts = new Map();
const activeApprovers = new Map(); // id -> username
const awaitingEmojiPacks = new Set();


const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];

const EMOJIS_FILE = path.join(__dirname, 'emojis.json');
let emojis = {};

function loadInstances() {
  try {
    const data = fs.readFileSync(INSTANCES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      instances = parsed.map(inst => ({
        imageModel: DEFAULT_IMAGE_MODEL,
        imagePrompt: DEFAULT_IMAGE_PROMPT,
        imageQuality: DEFAULT_IMAGE_QUALITY,
        imageSize: DEFAULT_IMAGE_SIZE,
        postSuffix: DEFAULT_POST_SUFFIX,
        referenceImages: [],
        ...inst,
        referenceImages: Array.isArray(inst.referenceImages) ? inst.referenceImages : [],
        postSuffix: typeof inst.postSuffix === 'string' ? inst.postSuffix : DEFAULT_POST_SUFFIX,
      }));
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load instances', e);
  }
  computeApprovers();
}

function saveInstances() {
  try {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  } catch (e) {
    console.error('Failed to save instances', e);
  }
  computeApprovers();
}

function computeApprovers() {
  const set = new Set();
  for (const inst of instances) {
    if (Array.isArray(inst.approvers)) {
      for (const u of inst.approvers) set.add(String(u).toLowerCase());
    }
  }
  approvers = Array.from(set);
  saveApprovers();
}

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
    if (Array.isArray(parsed)) {
      filters = parsed.map(f => {
        const ms = typeof f.min_score === 'number' ? f.min_score : 7;
        return { ...f, min_score: ms };
      });
    }
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

function loadAuthors() {
  try {
    const data = fs.readFileSync(AUTHORS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) authors = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load authors', e);
  }
}

function saveAuthors() {
  try {
    fs.writeFileSync(AUTHORS_FILE, JSON.stringify(authors, null, 2));
  } catch (e) {
    console.error('Failed to save authors', e);
  }
}

function loadApprovers() {
  try {
    const data = fs.readFileSync(APPROVERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) approvers = parsed.map(u => String(u).toLowerCase());
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load approvers', e);
  }
}

function saveApprovers() {
  try {
    fs.writeFileSync(APPROVERS_FILE, JSON.stringify(approvers, null, 2));
  } catch (e) {
    console.error('Failed to save approvers', e);
  }
}

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) users = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load users', e);
  }
  if (!users.length) {
    users.push({ login: 'root', password: '1111' });
    saveUsers();
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

function loadEmojis() {
  try {
    const data = fs.readFileSync(EMOJIS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object') emojis = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load emojis', e);
  }
}

function saveEmojis() {
  try {
    fs.writeFileSync(EMOJIS_FILE, JSON.stringify(emojis, null, 2));
  } catch (e) {
    console.error('Failed to save emojis', e);
  }
}


loadTgSources();
loadFilters();
loadAuthors();
loadInstances();
loadUsers();
loadEmojis();
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

botEvents.on('callback', async (query) => {
  const m = /^([a-z_]+):(.+)$/.exec(query.data || '');
  if (!m) return;
  const [, action, id] = m;
  if (action === 'approve') {
    const post = awaitingPosts.get(id);
    if (post) {
      awaitingPosts.delete(id);
      try {
        await postToChannel(post);
        await answerCallback(query.id, 'Approved');
      } catch (e) {
        await answerCallback(query.id, 'Failed to post');
      }
    }
  } else if (action === 'approve_image') {
    const post = awaitingPosts.get(id);
    if (post) {
      if (query.message) {
        deleteMessage(query.message.chat.id, query.message.message_id).catch(() => {});
      }
      answerCallback(query.id).catch(() => {});
      sendMessage(query.from.id, 'Generating image...', {}, post.instanceId).catch(() => {});
      try {
        log(`Generating image for post ${id}`, post.instanceId);
        const inst = instances.find(i => i.id === post.instanceId);
        const model = inst?.imageModel || DEFAULT_IMAGE_MODEL;
        const basePrompt = inst?.imagePrompt || DEFAULT_IMAGE_PROMPT;
        const url = await generateImage(model, basePrompt, post.text, inst, post);
        log(`Generated image for post ${id}`, post.instanceId);
        post.media = url;
        awaitingPosts.set(id, post);
        const approverList = inst && Array.isArray(inst.approvers) ? inst.approvers : approvers;
        for (const [uid, name] of activeApprovers.entries()) {
          if (approverList.includes(name)) {
            const decorated = { ...post, text: applyCustomEmojis(post.text || '') };
            sendApprovalRequest(uid, decorated).catch(() => {});
          }
        }
      } catch (e) {
        log(`Failed generating image for post ${id}: ${e.message}`, post.instanceId);
        sendMessage(query.from.id, 'Failed to generate image.', {}, post.instanceId).catch(() => {});
      }
    }
    return;
  } else if (action === 'cancel') {
    const post = awaitingPosts.get(id);
    if (post) {
      awaitingPosts.delete(id);
      answerCallback(query.id, 'Cancelled').catch(() => {});
    }
  }
  if (query.message) {
    deleteMessage(query.message.chat.id, query.message.message_id).catch(() => {});
  }
});

botEvents.on('start_approving', (msg) => {
  const id = String(msg.from.id);
  const username = msg.from.username ? msg.from.username.toLowerCase() : '';
  if (approvers.includes(username)) {
    activeApprovers.set(id, username);
    sendMessage(id, 'You will now receive approval requests.', {}, undefined).catch(() => {});
  } else {
    sendMessage(id, 'You are not an approver.', {}, undefined).catch(() => {});
  }
});

botEvents.on('add_emojis', (msg) => {
  const id = String(msg.from.id);
  const username = msg.from.username ? msg.from.username.toLowerCase() : '';
  if (approvers.includes(username)) {
    awaitingEmojiPacks.add(id);
    sendMessage(id, 'Send emoji pack', {}, undefined).catch(() => {});
  } else {
    sendMessage(id, 'You are not an approver.', {}, undefined).catch(() => {});
  }
});

botEvents.on('message', (msg) => {
  const id = String(msg.from.id);
  if (!awaitingEmojiPacks.has(id) || !msg.text) return;
  awaitingEmojiPacks.delete(id);
  const map = parseEmojiPack(msg);
  let added = 0;
  for (const [emoji, emojiId] of Object.entries(map)) {
    if (emoji && emojiId) {
      emojis[emoji] = emojiId;
      added++;
    }
  }
  if (added) saveEmojis();
  sendMessage(id, added ? `Added ${added} custom emojis.` : 'No emojis added.', {}, undefined).catch(() => {});
});


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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'none',
  ...(proxyUrl ? { fetchOptions: { dispatcher: new ProxyAgent(proxyUrl) } } : {})
});

async function detectMimeAndData(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  let mime = 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) mime = 'image/png';
  return { mime, data: buffer.toString('base64') };
}

async function loadReferenceImage(name) {
  const filePath = path.join(__dirname, 'uploads', name);
  const { mime } = await detectMimeAndData(filePath);
  const ext = mime === 'image/png' ? '.png' : '.jpg';
  return toFile(fs.createReadStream(filePath), name + ext, { type: mime });
}

async function generateImage(model, basePrompt, text, inst, post) {
  const prompt = basePrompt.split('{postText}').join(text);
  const refs = Array.isArray(inst?.referenceImages) ? inst.referenceImages : [];
  const quality = IMAGE_QUALITIES.includes(inst?.imageQuality)
    ? inst.imageQuality
    : DEFAULT_IMAGE_QUALITY;
  let size = inst?.imageSize || DEFAULT_IMAGE_SIZE;
  if (model === 'dall-e-2' && !DALL_E2_SIZES.includes(size)) size = DEFAULT_IMAGE_SIZE;
  if (!IMAGE_SIZES.includes(size)) size = DEFAULT_IMAGE_SIZE;
  if ((model === 'gpt-image-1' || model === 'gpt-4o') && refs.length) {
    const images = await Promise.all(refs.map(loadReferenceImage));
    const options = { model, prompt, image: images, size, quality };
    const img = await openai.images.edit(options);
    const first = img.data?.[0];
    if (!first) return null;
    if (post) {
      awaitingPosts.set(post.id, post);
    }
    if (first.url) return first.url;
    if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
    return null;
  }
  const options = { model, prompt, size, quality };
  const img = await openai.images.generate(options);
  const first = img.data?.[0];
  if (!first) return null;
  if (post) {
    awaitingPosts.set(post.id, post);
  }
  if (first.url) return first.url;
  if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return null;
}

function applyCustomEmojis(text) {
  if (!text) return text;
  let result = String(text);
  for (const [emoji, id] of Object.entries(emojis)) {
    if (!emoji || !id) continue;
    const escaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    result = result.replace(re, `<tg-emoji emoji-id="${id}">${emoji}</tg-emoji>`);
  }
  return result;
}

function parseEmojiPack(msg) {
  const text = msg.text || '';
  const entities = Array.isArray(msg.entities) ? msg.entities : [];
  const result = {};
  const lines = text.split('\n');
  let offset = 0;
  for (const line of lines) {
    const dash = line.indexOf('-');
    if (dash === -1) { offset += line.length + 1; continue; }
    const regular = line.slice(0, dash).trim();
    if (!regular) { offset += line.length + 1; continue; }
    const startSearch = offset + dash + 1;
    const entity = entities.find(e => e.type === 'custom_emoji' && e.offset >= startSearch && e.offset < offset + line.length);
    if (entity) {
      result[regular] = entity.custom_emoji_id;
    }
    offset += line.length + 1;
  }
  return result;
}
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  if (req.path === '/api/login') return next();
  let token;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) {
    log('Missing auth token');
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    log(`Authenticated ${user.login}`);
    next();
  } catch (e) {
    log(`Invalid token: ${e.message}`);
    res.status(401).json({ error: 'invalid token' });
  }
});
const PORT = process.env.PORT || 3001;

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'News API', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }]
  },
  apis: [__filename]
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post('/api/login', (req, res) => {
  const { login, password } = req.body || {};
  log(`Login attempt for ${login}`);
  const user = users.find(u => u.login === login && u.password === password);
  if (!user) {
    log(`Login failed for ${login}`);
    return res.status(401).json({ error: 'invalid credentials' });
  }
  log(`Login success for ${login}`);
  const token = jwt.sign({ login: user.login }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/api/logout', (req, res) => {
  log(`Logout for ${req.user ? req.user.login : 'unknown'}`);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  log(`/api/me for ${req.user.login}`);
  res.json({ login: req.user.login });
});

app.get('/api/users', (req, res) => {
  res.json(users.map(u => u.login));
});

app.post('/api/users', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'missing fields' });
  if (users.find(u => u.login === login)) return res.status(400).json({ error: 'exists' });
  users.push({ login, password });
  saveUsers();
  res.json({ ok: true });
});

app.delete('/api/users/:login', (req, res) => {
  const idx = users.findIndex(u => u.login === req.params.login);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  users.splice(idx, 1);
  saveUsers();
  res.json({ ok: true });
});

app.get('/api/emojis', (req, res) => {
  res.json(emojis);
});

app.post('/api/emojis', (req, res) => {
  const { emoji, id } = req.body || {};
  if (!emoji || !id) return res.status(400).json({ error: 'emoji and id required' });
  emojis[emoji] = id;
  saveEmojis();
  res.json({ ok: true });
});

app.delete('/api/emojis', (req, res) => {
  const { emoji } = req.query;
  if (!emoji) return res.status(400).json({ error: 'emoji required' });
  if (emojis[emoji]) {
    delete emojis[emoji];
    saveEmojis();
  }
  res.json({ ok: true });
});


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
      posts.forEach(p => {
        if (!scrapedPostUrls.has(p.url)) {
          scrapedPostUrls.add(p.url);
          log(`Scraped TG post: ${p.title} - ${p.url}`);
        }
      });
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
      if (!scrapedPostUrls.has(post.url)) {
        scrapedPostUrls.add(post.url);
        log(`Scraped TG post: ${post.title} - ${post.url}`);
      }
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

app.get('/api/instances', (req, res) => {
  res.json(
    instances.map(
      ({
        id,
        title,
        tgUrls = [],
        channels = [],
        filter = 'none',
        author = 'none',
        mode = 'json',
        tab = 'tg',
        imageModel = DEFAULT_IMAGE_MODEL,
        imagePrompt = DEFAULT_IMAGE_PROMPT,
        imageQuality = DEFAULT_IMAGE_QUALITY,
        imageSize = DEFAULT_IMAGE_SIZE,
        referenceImages = [],
        postSuffix = DEFAULT_POST_SUFFIX,
      }) => ({
        id,
        title,
        tgUrls,
        channels,
        filter,
        author,
        mode,
        tab,
        imageModel,
        imagePrompt,
        imageQuality,
        imageSize,
        referenceImages,
        postSuffix,
      }),
    ),
  );
});

app.post('/api/instances', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const inst = {
    id: Date.now().toString(16) + Math.random().toString(16).slice(2),
    title,
    tgUrls: [],
    channels: [],
    filter: 'none',
    author: 'none',
    mode: 'json',
    tab: 'tg',
    approvers: [],
    imageModel: DEFAULT_IMAGE_MODEL,
    imagePrompt: DEFAULT_IMAGE_PROMPT,
    imageQuality: DEFAULT_IMAGE_QUALITY,
    imageSize: DEFAULT_IMAGE_SIZE,
    referenceImages: [],
    postSuffix: DEFAULT_POST_SUFFIX
  };
  instances.push(inst);
  saveInstances();
  res.json(inst);
});

app.get('/api/instances/:id', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  res.json(inst);
});

app.put('/api/instances/:id', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  Object.assign(inst, req.body);
  saveInstances();
  res.json({ ok: true });
});

app.delete('/api/instances/:id', (req, res) => {
  const idx = instances.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  instances.splice(idx, 1);
  saveInstances();
  res.json({ ok: true });
});

app.get('/api/instances/:id/approvers', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  res.json(inst && Array.isArray(inst.approvers) ? inst.approvers : []);
});

app.post('/api/instances/:id/approvers', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const clean = String(username).replace(/^@/, '').toLowerCase();
  inst.approvers = inst.approvers || [];
  if (!inst.approvers.includes(clean)) {
    inst.approvers.push(clean);
    saveInstances();
  }
  res.json({ ok: true });
});

app.delete('/api/instances/:id/approvers', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username required' });
  const clean = String(username).replace(/^@/, '').toLowerCase();
  const idx = (inst.approvers || []).findIndex(u => u === clean);
  if (idx !== -1) {
    inst.approvers.splice(idx, 1);
    saveInstances();
  }
  res.json({ ok: true });
});

app.get('/api/instances/:id/post-channels', (req, res) => {
  res.json(listInstanceChannels(req.params.id));
});

app.post('/api/instances/:id/post-channels', async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: 'link required' });
    const info = await addChannel(req.params.id, link);
    if (!info) return res.status(400).json({ error: 'failed to resolve' });
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/instances/:id/reference-images', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  res.json(inst.referenceImages || []);
});

app.post('/api/instances/:id/reference-images', upload.array('images', 5), (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  inst.referenceImages = inst.referenceImages || [];
  if (inst.referenceImages.length + (req.files?.length || 0) > 5) {
    return res.status(400).json({ error: 'max 5 images' });
  }
  for (const file of req.files || []) {
    inst.referenceImages.push(file.filename);
  }
  saveInstances();
  res.json(inst.referenceImages);
});

app.delete('/api/instances/:id/reference-images/:name', (req, res) => {
  const inst = instances.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'not found' });
  inst.referenceImages = inst.referenceImages || [];
  const { name } = req.params;
  const idx = inst.referenceImages.indexOf(name);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  inst.referenceImages.splice(idx, 1);
  fs.unlink(path.join(__dirname, 'uploads', name), () => {});
  saveInstances();
  res.json({ ok: true });
});

app.get('/api/awaiting', (req, res) => {
  res.json(Array.from(awaitingPosts.values()));
});

app.post('/api/awaiting/:id/approve', async (req, res) => {
  const { id } = req.params;
  const post = awaitingPosts.get(id);
  if (!post) return res.status(404).json({ error: 'not found' });
  awaitingPosts.delete(id);
  try {
    await postToChannel(post);
    res.json({ ok: true });
  } catch (e) {
    log(`Failed posting awaiting ${id}: ${e.message}`, post.instanceId);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/awaiting/:id/image', async (req, res) => {
  const { id } = req.params;
  const post = awaitingPosts.get(id);
  if (!post) return res.status(404).json({ error: 'not found' });
  try {
    log(`Generating image for post ${id}`, post.instanceId);
    const body = req.body || {};
    const inst = instances.find(i => i.id === post.instanceId);
    const model = body.model || inst?.imageModel || DEFAULT_IMAGE_MODEL;
    const basePrompt = body.prompt || inst?.imagePrompt || DEFAULT_IMAGE_PROMPT;
    if (body.quality) inst.imageQuality = body.quality;
    if (body.size) inst.imageSize = body.size;
    const url = await generateImage(model, basePrompt, post.text, inst, post);
    log(`Generated image for post ${id}`, post.instanceId);
    post.media = url;
    awaitingPosts.set(id, post);
    const approverList = inst && Array.isArray(inst.approvers) ? inst.approvers : approvers;
    for (const [uid, name] of activeApprovers.entries()) {
      if (approverList.includes(name)) {
        const decorated = { ...post, text: applyCustomEmojis(post.text || '') };
        sendApprovalRequest(uid, decorated).catch(() => {});
      }
    }
    res.json({ ok: true });
  } catch (e) {
    log(`Failed generating image for post ${id}: ${e.message}`, post.instanceId);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/awaiting/:id/cancel', (req, res) => {
  const { id } = req.params;
  if (!awaitingPosts.has(id)) return res.status(404).json({ error: 'not found' });
  const post = awaitingPosts.get(id);
  awaitingPosts.delete(id);
  res.json({ ok: true });
});

function postToChannel({ channel, text, media, instanceId }) {
  const processed = applyCustomEmojis(text || '');
  if (!media && (!processed || !processed.trim())) {
    return Promise.reject(new Error('text or media required'));
  }
  return media
    ? (media.toLowerCase().endsWith('.mp4')
        ? sendVideo(channel, media, processed, {}, instanceId)
        : sendPhoto(channel, media, processed, {}, instanceId))
    : sendMessage(channel, processed, {}, instanceId);
}

app.post('/api/post', async (req, res) => {
  try {
    const { channel, text, media, instanceId, id: customId } = req.body;
    if (!channel) return res.status(400).json({ error: 'channel required' });
    if (!text && !media) return res.status(400).json({ error: 'text or media required' });
    if (activeApprovers.size === 0) {
      return res.status(400).json({ error: 'no active approvers' });
    }
    const inst = instances.find(i => i.id === instanceId);
    const approverList = inst && Array.isArray(inst.approvers) ? inst.approvers : approvers;
    const targets = [];
    for (const [uid, name] of activeApprovers.entries()) {
      if (approverList.includes(name)) targets.push(uid);
    }
    if (targets.length) {
      const id = customId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const info = { id, channel, text, media, instanceId };
      awaitingPosts.set(id, info);
      for (const uid of targets) {
        const decorated = { ...info, text: applyCustomEmojis(info.text || '') };
        sendApprovalRequest(uid, decorated).catch(() => {});
      }
      log(`Queued post ${id} for approval`, instanceId);
      res.json({ ok: true, awaiting: true, id });
      return;
    }
    log(`Posting to ${channel}`, instanceId);
    await postToChannel({ channel, text, media, instanceId });
    log(`Posted to ${channel}`, instanceId);
    res.json({ ok: true });
  } catch (e) {
    log(`Failed posting to ${req.body.channel}: ${e.message}`, instanceId);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/logs', (req, res) => {
  const { instanceId } = req.query;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  const logListener = (info) => {
    if (!info || typeof info.message !== 'string') return;
    if (info.instanceId === instanceId) {
      res.write(`data: ${JSON.stringify({ message: info.message })}\n\n`);
    }
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

app.get('/api/tg-source-info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const posts = await scrapeTelegramChannel(url);
    if (Array.isArray(posts) && posts.length) {
      return res.json({ title: posts[0].channelTitle, image: posts[0].channelImage });
    }
    res.status(404).json({ error: 'not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    }
    const resp = await openai.models.list();
    const models = resp.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt-') || id.startsWith('o'))
      .sort();
    res.json(models);
  } catch (e) {
    console.error('Failed to list models', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/filters', (req, res) => {
  res.json(filters);
});

app.post('/api/vector-stores', upload.array('attachments'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { name } = req.body;
    log(`Creating vector store${name ? ' ' + name : ''}`);
    const vs = await openai.vectorStores.create({ name: name || undefined });
    const fileIds = [];
    for (const file of req.files || []) {
      const toUpload = await toFile(fs.createReadStream(file.path), file.originalname)
      const info = await openai.vectorStores.files.upload(vs.id, toUpload);
      fileIds.push(info.id);
      fs.unlink(file.path, () => {});
    }
    log(`Created vector store ${vs.id}`);
    res.json({ id: vs.id, file_ids: fileIds });
  } catch (e) {
    const msg = e.message;
    console.error('Failed to create vector store', msg);
    log(`Failed to create vector store: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/filters', upload.none(), async (req, res) => {
  try {
    const { title, model, instructions, vector_store_id, min_score } = req.body;
    if (!title || !model || !instructions) return res.status(400).json({ error: 'missing fields' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Creating filter ${title}`);
    const vectorStoreId = vector_store_id || null;
    const createResp = await openai.beta.assistants.create({
      name: title,
      model,
      instructions,
      tools: vectorStoreId ? [{ type: 'file_search' }] : [],
      tool_resources: vectorStoreId ? { file_search: { vector_store_ids: [vectorStoreId] } } : undefined
    });
    const ms = parseFloat(min_score);
    const info = { id: createResp.id, title, model, instructions, file_ids: [], vector_store_id: vectorStoreId, min_score: isNaN(ms) ? 7 : ms };
    filters.push(info);
    saveFilters();
    log(`Created filter ${title}`);
    res.json(info);
  } catch (e) {
    const msg = e.message;
    console.error('Failed to create filter', msg);
    log(`Failed to create filter: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.put('/api/filters/:id', (req, res) => {
  const { id } = req.params;
  const filter = filters.find(f => f.id === id);
  if (!filter) return res.status(404).json({ error: 'not found' });
  if (req.body.min_score != null) {
    const ms = parseFloat(req.body.min_score);
    filter.min_score = isNaN(ms) ? filter.min_score : ms;
  }
  saveFilters();
  res.json(filter);
});

app.post('/api/filters/:id/files', upload.array('attachments'), async (req, res) => {
  try {
    const { id } = req.params;
    const filter = filters.find(f => f.id === id);
    if (!filter) return res.status(404).json({ error: 'not found' });
    if (!filter.vector_store_id) return res.status(400).json({ error: 'no vector store' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const added = [];
    for (const file of req.files || []) {
      const toUpload = await toFile(fs.createReadStream(file.path), file.originalname)
      const info = await openai.vectorStores.files.upload(filter.vector_store_id, toUpload);
      added.push(info.id);
      fs.unlink(file.path, () => {});
    }
    filter.file_ids.push(...added);
    saveFilters();
    log(`Added ${added.length} file(s) to filter ${filter.title}`);
    res.json({ file_ids: added });
  } catch (e) {
    const msg = e.message;
    console.error('Failed to add files', msg);
    log(`Failed to add files: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/filters/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    const filter = filters.find(f => f.id === id);
    if (!filter) return res.status(404).json({ error: 'not found' });
    const { text, post_id } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Filtering post with ${filter.title}`);
    const resp = await openai.chat.completions.create({
      model: filter.model,
      messages: [
        { role: 'system', content: filter.instructions },
        { role: 'user', content: text }
      ]
    });
    const content = resp.choices[0].message.content;
    const m = content.match(/(\d+(?:\.\d+)?)/);
    const score = m ? parseFloat(m[1]) : 0;
    const tokens = resp.usage?.total_tokens || 0;
    if (post_id && awaitingPosts.has(post_id)) {
      const post = awaitingPosts.get(post_id);
      awaitingPosts.set(post_id, post);
    }
    log(`Score ${score} for post`);
    res.json({ score, content, tokens });
  } catch (e) {
    const msg = e.message;
    console.error('Failed to evaluate filter', msg);
    log(`Failed to evaluate filter: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/authors', (req, res) => {
  res.json(authors);
});

app.post('/api/authors', upload.none(), async (req, res) => {
  try {
    const { title, model, instructions, vector_store_id } = req.body;
    if (!title || !model || !instructions) return res.status(400).json({ error: 'missing fields' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Creating author ${title}`);
    const vectorStoreId = vector_store_id || null;
    const createResp = await openai.beta.assistants.create({
      name: title,
      model,
      instructions,
      tools: vectorStoreId ? [{ type: 'file_search' }] : [],
      tool_resources: vectorStoreId ? { file_search: { vector_store_ids: [vectorStoreId] } } : undefined
    });
    const info = { id: createResp.id, title, model, instructions, file_ids: [], vector_store_id: vectorStoreId };
    authors.push(info);
    saveAuthors();
    log(`Created author ${title}`);
    res.json(info);
  } catch (e) {
    const msg = e.message;
    console.error('Failed to create author', msg);
    log(`Failed to create author: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/authors/:id/files', upload.array('attachments'), async (req, res) => {
  try {
    const { id } = req.params;
    const author = authors.find(a => a.id === id);
    if (!author) return res.status(404).json({ error: 'not found' });
    if (!author.vector_store_id) return res.status(400).json({ error: 'no vector store' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const added = [];
    for (const file of req.files || []) {
      const toUpload = await toFile(fs.createReadStream(file.path), file.originalname);
      const info = await openai.vectorStores.files.upload(author.vector_store_id, toUpload);
      added.push(info.id);
      fs.unlink(file.path, () => {});
    }
    author.file_ids.push(...added);
    saveAuthors();
    log(`Added ${added.length} file(s) to author ${author.title}`);
    res.json({ file_ids: added });
  } catch (e) {
    const msg = e.message;
    console.error('Failed to add files', msg);
    log(`Failed to add files: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/authors/:id/rewrite', async (req, res) => {
  try {
    const { id } = req.params;
    const author = authors.find(a => a.id === id);
    if (!author) return res.status(404).json({ error: 'not found' });
    const { text, post_id } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    log(`Authoring post with ${author.title}`);
    const resp = await openai.chat.completions.create({
      model: author.model,
      messages: [
        { role: 'system', content: author.instructions },
        { role: 'user', content: text }
      ]
    });
    const newText = resp.choices[0].message.content;
    const tokens = resp.usage?.total_tokens || 0;
    if (post_id) {
      if (awaitingPosts.has(post_id)) {
        const post = awaitingPosts.get(post_id);
        awaitingPosts.set(post_id, post);
      }
    }
    res.json({ text: newText, tokens });
  } catch (e) {
    const msg = e.message;
    console.error('Failed to rewrite text', msg);
    log(`Failed to rewrite text: ${msg}`);
    res.status(500).json({ error: msg });
  }
});


app.get('/api/tgnews', async (req, res) => {
  const { instanceId } = req.query;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const logListener = (info) => {
    if (!info || typeof info.message !== 'string') return;
    if (info.instanceId === instanceId) {
      res.write(`event: log\ndata: ${JSON.stringify({ message: info.message })}\n\n`);
    }
  };
  botEvents.on('log', logListener);

  const urls = req.query.urls ? req.query.urls.split(',') : tgSources;
  const includeHistory = req.query.history !== 'false';
  const seen = new Set();
  let initial = true;

  const sendItems = async () => {
    for (const url of urls) {
      try {
        log(`Scraping TG ${url}`, instanceId);
        const items = await scrapeTelegramChannel(url);
        for (const item of items) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          if (!includeHistory && initial) continue;
          log(`Found post ${item.url}`, instanceId);
          res.write(`data: ${JSON.stringify({ ...item, source: url })}\n\n`);
          log(`Sent post ${item.url}`, instanceId);
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

if (fs.existsSync(CLIENT_DIST)) {
  // Express@5 requires a named wildcard parameter
  app.get('/*rest', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/docs')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});
