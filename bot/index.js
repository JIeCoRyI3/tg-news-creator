import dotenv from 'dotenv';
dotenv.config();
import TelegramBot from 'node-telegram-bot-api';
import EventSource from 'eventsource';

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

bot.setMyCommands([
  { command: 'connect', description: 'Connect to news server' },
  { command: 'show_news', description: 'Show new news' },
  { command: 'stop', description: 'Stop sending news' },
  { command: 'disconnect', description: 'Disconnect from news server' }
]);

try {
  await bot.setChatMenuButton({
    type: 'commands'
  });
} catch (e) {
  console.error('Failed to set chat menu button', e);
}

const connections = new Map(); // chatId -> { es, show, seen, lastNews, lastPing, interval }

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
    const state = { es, show: false, seen: new Set(), lastNews: Date.now(), lastPing: Date.now(), interval: null };
    connections.set(chatId, state);
    es.onopen = () => {
      state.interval = setInterval(() => {
        if (state.show && Date.now() - state.lastNews > 30000) {
          const sincePing = Math.floor((Date.now() - state.lastPing) / 1000);
          bot.sendMessage(chatId, `No new news yet. Last server ping ${sincePing}s ago.`);
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
        bot.sendMessage(chatId, `\u0060\u0060\u0060\n${JSON.stringify(data, null, 2)}\n\u0060\u0060\u0060`, { parse_mode: 'Markdown' });
      } catch {
        // ignore
      }
    };
    es.addEventListener('ping', () => {
      state.lastPing = Date.now();
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

bot.onText(/\/show_news/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await ensureConnection(chatId);
    askPermission(chatId);
  } catch (e) {
    bot.sendMessage(chatId, `Error during connecting: ${e.message}`);
  }
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  if (query.data === 'allow_news') {
    const state = connections.get(chatId);
    if (state) state.show = true;
    bot.answerCallbackQuery(query.id, { text: 'News feed started' });
  } else if (query.data === 'deny_news') {
    bot.answerCallbackQuery(query.id, { text: 'Permission denied' });
  }
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  const state = connections.get(chatId);
  if (state) {
    state.show = false;
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
