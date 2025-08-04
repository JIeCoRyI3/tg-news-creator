const test = require('node:test');
const assert = require('node:assert');

const {
  applyCustomEmojis,
  applyCustomEmojisWithInfo,
  parseEmojiPack,
  getStore
} = require('./index');
const db = require('./db');

const customEmoji = '<tg-emoji emoji-id="id123">😄</tg-emoji>';

test('applyCustomEmojis replaces mapped emoji with tags', () => {
  const login = 'tester1';
  db.addUser(login, 'pw');
  try {
    const store = getStore(login);
    store.emojis = { '😄': 'id123' };
    const result = applyCustomEmojis('Hello 😄!', login);
    assert.strictEqual(result, `Hello ${customEmoji}!`);
  } finally {
    db.deleteUser(login);
  }
});

test('applyCustomEmojisWithInfo returns text and list of replaced emojis', () => {
  const login = 'tester2';
  db.addUser(login, 'pw');
  try {
    const store = getStore(login);
    store.emojis = { '😄': 'id123', '😉': 'id456' };
    const { text, replaced } = applyCustomEmojisWithInfo('Hi 😄😉', login);
    assert.strictEqual(
      text,
      `Hi <tg-emoji emoji-id="id123">😄</tg-emoji><tg-emoji emoji-id="id456">😉</tg-emoji>`
    );
    assert.deepStrictEqual(replaced.sort(), ['😄', '😉']);
  } finally {
    db.deleteUser(login);
  }
});

test('parseEmojiPack builds emoji mapping from message', () => {
  const msg = {
    text: ':smile: - \uE001',
    entities: [{ type: 'custom_emoji', offset: 10, length: 1, custom_emoji_id: 'id123' }]
  };
  const result = parseEmojiPack(msg);
  assert.deepStrictEqual(result, { ':smile:': 'id123', '😄': 'id123' });
});
