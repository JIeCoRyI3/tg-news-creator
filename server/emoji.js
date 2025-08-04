const emoji = require('node-emoji');

/**
 * Factory that creates emoji helper functions using the provided store accessor.
 * @param {function(string):Object} getStore function returning the user store
 */
function createEmojiUtils(getStore) {
  function applyCustomEmojis(text, login) {
    if (!text) return text;
    const map = login ? getStore(login).emojis : {};
    let result = String(text);
    for (const [em, id] of Object.entries(map)) {
      if (!em || !id) continue;
      const escaped = em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'g');
      result = result.replace(re, `<tg-emoji emoji-id="${id}">${em}</tg-emoji>`);
    }
    return result;
  }

  function applyCustomEmojisWithInfo(text, login) {
    if (!text) return { text, replaced: [] };
    const map = login ? getStore(login).emojis : {};
    let result = String(text);
    const replaced = [];
    for (const [em, id] of Object.entries(map)) {
      if (!em || !id) continue;
      const escaped = em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'g');
      if (re.test(result)) {
        result = result.replace(re, `<tg-emoji emoji-id="${id}">${em}</tg-emoji>`);
        replaced.push(em);
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

  return { applyCustomEmojis, applyCustomEmojisWithInfo, parseEmojiPack };
}

module.exports = { createEmojiUtils };
