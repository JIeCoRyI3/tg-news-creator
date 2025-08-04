const emoji = require('node-emoji');

function applyCustomEmojis(text, map = {}) {
  if (!text) return text;
  let result = String(text);
  for (const [emo, id] of Object.entries(map)) {
    if (!emo || !id) continue;
    const escaped = emo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    result = result.replace(re, `<tg-emoji emoji-id="${id}">${emo}</tg-emoji>`);
  }
  return result;
}

function applyCustomEmojisWithInfo(text, map = {}) {
  if (!text) return { text, replaced: [] };
  let result = String(text);
  const replaced = [];
  for (const [emo, id] of Object.entries(map)) {
    if (!emo || !id) continue;
    const escaped = emo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    if (re.test(result)) {
      result = result.replace(re, `<tg-emoji emoji-id="${id}">${emo}</tg-emoji>`);
      replaced.push(emo);
    }
  }
  return { text: result, replaced };
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
      if (regular.startsWith(':') && regular.endsWith(':')) {
        const actual = emoji.get(regular);
        if (actual && actual !== regular) {
          result[actual] = entity.custom_emoji_id;
        }
      }
    }
    offset += line.length + 1;
  }
  return result;
}

module.exports = { applyCustomEmojis, applyCustomEmojisWithInfo, parseEmojiPack };
