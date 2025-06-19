const fs = require('fs');
const path = require('path');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN is not defined');
}

const ADMIN_FILE = path.join(__dirname, '../server/admin-channels.json');

const bot = new TelegramBot(token, { polling: true });

const adminChannels = new Map();
try {
  const data = fs.readFileSync(ADMIN_FILE, 'utf8');
  const obj = JSON.parse(data);
  for (const [id, info] of Object.entries(obj)) {
    adminChannels.set(id, info);
  }
} catch (e) {
  if (e.code !== 'ENOENT') console.error('Failed to load admin channels', e);
}

function persistChannels() {
  const obj = {};
  for (const [id, info] of adminChannels.entries()) {
    obj[id] = info;
  }
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to save admin channels', e);
  }
}

bot.on('my_chat_member', data => {
  if (data.chat?.type !== 'channel') return;
  const status = data.new_chat_member?.status;
  const info = { title: data.chat.title, username: data.chat.username ? `@${data.chat.username}` : null };
  if (status === 'administrator' || status === 'creator') {
    adminChannels.set(String(data.chat.id), info);
    persistChannels();
  } else if (adminChannels.has(String(data.chat.id))) {
    adminChannels.delete(String(data.chat.id));
    persistChannels();
  }
});

function listChannels() {
  const obj = {};
  for (const [id, info] of adminChannels.entries()) obj[id] = info;
  return obj;
}

async function sendMessage(channel, text) {
  await bot.sendMessage(channel, text, { parse_mode: 'Markdown' });
}

module.exports = { listChannels, sendMessage };
