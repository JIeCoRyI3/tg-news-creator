const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Load env from project root and server directory so the bot works
// regardless of the current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
const TelegramBot = require('node-telegram-bot-api');
const { EventEmitter } = require('events');

const botEvents = new EventEmitter();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN is not defined');
}

const ADMIN_FILE = path.join(__dirname, '../server/admin-channels.json');

const bot = new TelegramBot(token, { polling: true });

const adminChannels = new Map();

async function resolveLink(link) {
  const match = link.match(/t\.me\/(.+)/i);
  let identifier = link;
  if (match) {
    identifier = match[1].split(/[/?]/)[0];
    if (!identifier.startsWith('@') && !identifier.startsWith('+')) {
      identifier = '@' + identifier;
    }
  }
  try {
    const chat = await bot.getChat(identifier);
    return [String(chat.id), { title: chat.title, username: chat.username ? `@${chat.username}` : null }];
  } catch (e) {
    console.error('Failed to resolve channel', link, e.message);
    return null;
  }
}

async function loadChannels() {
  try {
    const data = fs.readFileSync(ADMIN_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      for (const link of parsed) {
        const res = await resolveLink(link);
        if (res) {
          const [id, info] = res;
          adminChannels.set(id, info);
          console.log('Resolved channel', link, '->', id);
          botEvents.emit('log', `Resolved channel ${link} -> ${id}`);
        } else {
          botEvents.emit('log', `Failed to resolve channel ${link}`);
        }
      }
      persistChannels();
    } else {
      for (const [id, info] of Object.entries(parsed)) {
        adminChannels.set(id, info);
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load admin channels', e);
  }
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
    console.log('Gained admin rights in', data.chat.title);
    botEvents.emit('log', `Gained admin rights in ${data.chat.title}`);
  } else if (adminChannels.has(String(data.chat.id))) {
    adminChannels.delete(String(data.chat.id));
    persistChannels();
    console.log('Lost admin rights in', data.chat.title);
    botEvents.emit('log', `Lost admin rights in ${data.chat.title}`);
  }
});

function listChannels() {
  const obj = {};
  for (const [id, info] of adminChannels.entries()) obj[id] = info;
  return obj;
}

async function sendMessage(channel, text) {
  try {
    await bot.sendMessage(channel, text, { parse_mode: 'Markdown' });
    console.log('Sent message to', channel);
    botEvents.emit('log', `Sent message to ${channel}`);
  } catch (e) {
    console.error('Failed to send message', channel, e.message);
    botEvents.emit('log', `Failed to send message to ${channel}: ${e.message}`);
    throw e;
  }
}

module.exports = { listChannels, sendMessage, botEvents };

(async () => {
  await loadChannels();
})();
