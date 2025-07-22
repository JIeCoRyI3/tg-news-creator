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
const channelsByInstance = new Map(); // instanceId -> Set of channel ids

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
          if (!channelsByInstance.has('default')) channelsByInstance.set('default', new Set());
          channelsByInstance.get('default').add(id);
          console.log('Resolved channel', link, '->', id);
          botEvents.emit('log', `Resolved channel ${link} -> ${id}`);
        } else {
          botEvents.emit('log', `Failed to resolve channel ${link}`);
        }
      }
      persistChannels();
    } else if (Object.values(parsed).every(v => v && typeof v === 'object' && (v.title || v.username))) {
      for (const [id, info] of Object.entries(parsed)) {
        adminChannels.set(id, info);
        if (!channelsByInstance.has('default')) channelsByInstance.set('default', new Set());
        channelsByInstance.get('default').add(id);
      }
    } else {
      for (const [inst, obj] of Object.entries(parsed)) {
        if (obj && typeof obj === 'object') {
          for (const [id, info] of Object.entries(obj)) {
            adminChannels.set(id, info);
            if (!channelsByInstance.has(inst)) channelsByInstance.set(inst, new Set());
            channelsByInstance.get(inst).add(id);
          }
        }
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Failed to load admin channels', e);
  }
}

function persistChannels() {
  const obj = {};
  for (const [inst, ids] of channelsByInstance.entries()) {
    obj[inst] = {};
    for (const id of ids) {
      const info = adminChannels.get(id);
      if (info) obj[inst][id] = info;
    }
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

function listInstanceChannels(instanceId) {
  const obj = {};
  const ids = channelsByInstance.get(instanceId) || new Set();
  for (const id of ids) {
    const info = adminChannels.get(id);
    if (info) obj[id] = info;
  }
  return obj;
}

async function addChannel(instanceId, link) {
  const res = await resolveLink(link);
  if (!res) return null;
  const [id, info] = res;
  adminChannels.set(id, info);
  if (!channelsByInstance.has(instanceId)) channelsByInstance.set(instanceId, new Set());
  channelsByInstance.get(instanceId).add(id);
  persistChannels();
  return { id, ...info };
}

async function sendMessage(channel, text, options = {}, instanceId) {
  try {
    await bot.sendMessage(channel, text, { parse_mode: 'HTML', ...options });
    const msg = `Sent message to ${channel}`;
    console.log(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
  } catch (e) {
    const msg = `Failed to send message to ${channel}: ${e.message}`;
    console.error(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
    throw e;
  }
}

function decodeDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[2], 'base64');
}

async function sendPhoto(channel, url, caption, options = {}, instanceId) {
  try {
    const payload = typeof url === 'string' && url.startsWith('data:')
      ? { source: decodeDataUrl(url) }
      : url;
    await bot.sendPhoto(channel, payload, { caption, parse_mode: 'HTML', ...options });
    const msg = `Sent photo to ${channel}`;
    console.log(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
  } catch (e) {
    const msg = `Failed to send photo to ${channel}: ${e.message}`;
    console.error(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
    throw e;
  }
}

async function sendVideo(channel, url, caption, options = {}, instanceId) {
  try {
    await bot.sendVideo(channel, url, { caption, parse_mode: 'HTML', ...options });
    const msg = `Sent video to ${channel}`;
    console.log(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
  } catch (e) {
    const msg = `Failed to send video to ${channel}: ${e.message}`;
    console.error(instanceId ? `[${instanceId}] ${msg}` : msg);
    botEvents.emit('log', { message: msg, instanceId });
    throw e;
  }
}

async function sendApprovalRequest(userId, post) {
  const keyboard = { inline_keyboard: [[
    { text: 'Approve', callback_data: `approve:${post.id}` },
    { text: 'Approve with new image', callback_data: `approve_image:${post.id}` },
    { text: 'Cancel', callback_data: `cancel:${post.id}` }
  ]] };
  const text = `Approve post to ${post.channel}?\n${post.text}`;
  if (post.media) {
    if (post.media.toLowerCase().endsWith('.mp4')) {
      await sendVideo(userId, post.media, text, { reply_markup: keyboard });
    } else {
      await sendPhoto(userId, post.media, text, { reply_markup: keyboard });
    }
  } else {
    await sendMessage(userId, text, { reply_markup: keyboard });
  }
}

bot.on('callback_query', (q) => {
  botEvents.emit('callback', q);
});

bot.onText(/\/start_approving/i, (msg) => {
  botEvents.emit('start_approving', msg);
});

function answerCallback(id, text) {
  return bot.answerCallbackQuery(id, { text });
}

function deleteMessage(chatId, messageId) {
  return bot.deleteMessage(chatId, messageId);
}

module.exports = {
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
};

(async () => {
  await loadChannels();
  await bot.setMyCommands([
    { command: 'start_approving', description: 'Receive approval requests' }
  ]);
})();
