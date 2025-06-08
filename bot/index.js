import dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
import EventSource from 'eventsource';
import { readFileSync, writeFileSync } from 'fs';

const ADMIN_FILE = new URL('./admin-channels.json', import.meta.url);

const token = process.env.BOT_TOKEN;
const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';

const ALL_SOURCES = [
  'bbc',
  'cnn',
  'reuters',
  'guardian',
  'aljazeera',
  'kyivindependent',
  'kyivpost',
  'unian',
  'pravda',
  'ukrinform',
  'rferl',
  'rbc',
  'skynews',
  'foxnews',
  'suspilne',
  'hromadske'
];

if (!token) {
  console.error('BOT_TOKEN is not defined');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// channelId (string) -> { title, username }
const adminChannels = new Map();

try {
  const data = readFileSync(ADMIN_FILE, 'utf8');
  const obj = JSON.parse(data);
  for (const [id, info] of Object.entries(obj)) {
    adminChannels.set(id, info);
  }
  if (adminChannels.size > 0) {
    console.log(`Loaded ${adminChannels.size} admin channel(s) from file`);
  }
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error('Failed to load admin channels', e);
  }
}

function persistAdminChannels() {
  const obj = {};
  for (const [id, info] of adminChannels.entries()) {
    obj[id] = info;
  }
  try {
    writeFileSync(ADMIN_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to persist admin channels', e);
  }
}

bot.setMyCommands([
  { command: 'connect', description: 'Connect to news server' },
  { command: 'show_news', description: 'Show new news' },
  { command: 'display_channels', description: 'List channels I can post to' },
  { command: 'post_news', description: 'Select channel to post news' },
  { command: 'stop', description: 'Stop sending news' },
  { command: 'disconnect', description: 'Disconnect from news server' },
  { command: 'debug', description: 'Show last 2 news from each source' }
]);

try {
  await bot.setChatMenuButton({
    type: 'commands'
  });
} catch (e) {
  console.error('Failed to set chat menu button', e);
}

bot.on('my_chat_member', (data) => {
  if (data.chat?.type === 'channel') {
    const status = data.new_chat_member?.status;
    const info = { title: data.chat.title, username: data.chat.username ? `@${data.chat.username}` : null };
    if (status === 'administrator' || status === 'creator') {
      adminChannels.set(String(data.chat.id), info);
      console.log(`Added channel ${info.username || info.title}`);
      persistAdminChannels();
    } else if (adminChannels.has(String(data.chat.id))) {
      adminChannels.delete(String(data.chat.id));
      console.log(`Removed channel ${info.username || info.title}`);
      persistAdminChannels();
    }
  }
});

const connections = new Map(); // chatId -> { es, show, seen, lastNews, lastPing, interval, channelId }

function disconnect(chatId) {
  const c = connections.get(chatId);
  if (c) {
    c.es.close();
    if (c.interval) clearInterval(c.interval);
    connections.delete(chatId);
  }
}

function ensureConnection(chatId) {
  return new Promise((resolve, reject) => {
    if (connections.has(chatId)) {
      return resolve();
    }
    const es = new EventSource(`${serverUrl}/api/news?sources=${ALL_SOURCES.join(',')}&history=false`);
    const state = { es, show: false, seen: new Set(), lastNews: Date.now(), lastPing: Date.now(), interval: null, channelId: null };
    connections.set(chatId, state);
    es.onopen = () => {
      state.interval = setInterval(() => {
        if (state.show && Date.now() - state.lastNews > 30000) {
          const sincePing = Math.floor((Date.now() - state.lastPing) / 1000);
          console.log(`Chat ${chatId}: no news yet. Last server ping ${sincePing}s ago.`);
        }
      }, 30000);
      resolve();
    };
    es.onerror = (err) => {
      disconnect(chatId);
      reject(err);
    };
    es.onmessage = (event) => {
      if (!state.show) return;
      try {
        const data = JSON.parse(event.data);
        if (data.url && state.seen.has(data.url)) return;
        if (data.url) state.seen.add(data.url);
        state.lastNews = Date.now();
        const targets = [chatId];
        if (state.channelId && state.channelId !== String(chatId)) {
          targets.push(state.channelId);
        }
        const text = `*${data.title}*\n${data.url}`;
        for (const t of targets) {
          bot.sendMessage(String(t), text, { parse_mode: 'Markdown' })
            .catch(e => console.error('Failed to send message to', t, e.message));
        }
      } catch {
        // ignore
      }
    };
    es.addEventListener('ping', () => {
      state.lastPing = Date.now();
      console.log(`Chat ${chatId}: received ping`);
    });
  });
}

bot.onText(/\/connect/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await ensureConnection(chatId);
    bot.sendMessage(chatId, 'Connected successfully');
  } catch (e) {
    bot.sendMessage(chatId, `Error during connecting: ${e.message}`);
  }
});

function askPermission(chatId) {
  bot.sendMessage(chatId, 'Allow me to send you news updates?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Yes', callback_data: 'allow_news' },
          { text: 'No', callback_data: 'deny_news' }
        ]
      ]
    }
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;');
}

function formatCaption(item) {
  const title = `<b>${escapeHtml(item.title)}</b>`;
  const text = item.text ? `\n\n${escapeHtml(item.text)}` : '';
  return `${title}${text}\n\n<a href="${item.url}">Read more</a>`;
}

function fetchLatestNews() {
  return new Promise((resolve, reject) => {
    const url = `${serverUrl}/api/news?sources=${ALL_SOURCES.join(',')}&history=true`;
    const es = new EventSource(url);
    const bySource = {};
    const expected = ALL_SOURCES.length * 2;
    let received = 0;
    const timeout = setTimeout(() => {
      es.close();
      resolve(bySource);
    }, 15000);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!bySource[data.source]) bySource[data.source] = [];
        if (bySource[data.source].length < 2) {
          bySource[data.source].push(data);
          received++;
          if (received >= expected) {
            clearTimeout(timeout);
            es.close();
            resolve(bySource);
          }
        }
      } catch {}
    };

    es.onerror = (err) => {
      clearTimeout(timeout);
      es.close();
      reject(err);
    };
  });
}

bot.onText(/\/show_news/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await ensureConnection(chatId);
    askPermission(chatId);
  } catch (e) {
    bot.sendMessage(chatId, `Error during connecting: ${e.message}`);
  }
});

bot.onText(/\/display_channels/, (msg) => {
  const chatId = msg.chat.id;
  if (adminChannels.size === 0) {
    bot.sendMessage(chatId, 'No channels found where I am administrator.');
    return;
  }
  const list = [...adminChannels.values()].map((c, i) => `${i + 1}. ${c.username || c.title}`).join('\n');
  bot.sendMessage(chatId, `Available channels:\n${list}`);
});

bot.onText(/\/post_news/, (msg) => {
  const chatId = msg.chat.id;
  const state = connections.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, 'Please /connect first.');
    return;
  }
  if (adminChannels.size === 0) {
    bot.sendMessage(chatId, 'No channels available. Promote me to a channel first.');
    return;
  }
  const keyboard = [...adminChannels.entries()].map(([id, c]) => [{ text: c.username || c.title, callback_data: `post:${id}` }]);
  bot.sendMessage(chatId, 'Select channel to post news:', { reply_markup: { inline_keyboard: keyboard } });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  if (query.data === 'allow_news') {
    const state = connections.get(chatId);
    if (state) state.show = true;
    bot.answerCallbackQuery(query.id, { text: 'News feed started' });
  } else if (query.data === 'deny_news') {
    bot.answerCallbackQuery(query.id, { text: 'Permission denied' });
  } else if (query.data.startsWith('post:')) {
    const channelId = query.data.slice(5);
    const channel = adminChannels.get(channelId);
    const state = connections.get(chatId);
    if (state && channel) {
      state.show = true;
      state.channelId = channelId;
      bot.answerCallbackQuery(query.id, { text: `Posting news to ${channel.username || channel.title}` });
    } else {
      bot.answerCallbackQuery(query.id, { text: 'Unable to start posting' });
    }
  }
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  const state = connections.get(chatId);
  if (state) {
    state.show = false;
    state.channelId = null;
    bot.sendMessage(chatId, 'Stopped');
  } else {
    bot.sendMessage(chatId, 'Not connected');
  }
});

bot.onText(/\/disconnect/, (msg) => {
  const chatId = msg.chat.id;
  if (connections.has(chatId)) {
    disconnect(chatId);
    bot.sendMessage(chatId, 'Disconnected');
  } else {
    bot.sendMessage(chatId, 'Not connected');
  }
});

bot.onText(/\/debug/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const news = await fetchLatestNews();
    for (const src of ALL_SOURCES) {
      const items = news[src];
      if (!items) continue;
      for (const item of items) {
        const caption = formatCaption(item);
        if (item.image) {
          await bot.sendPhoto(chatId, item.image, { caption, parse_mode: 'HTML' });
        } else {
          await bot.sendMessage(chatId, `${item.title}\n\n${item.text || ''}\n\n${item.url}`);
        }
      }
    }
  } catch (e) {
    bot.sendMessage(chatId, `Error fetching news: ${e.message}`);
  }
});
