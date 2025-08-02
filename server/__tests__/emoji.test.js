const fs = require('fs');
const os = require('os');
const path = require('path');

describe('emoji utilities', () => {
  let funcs;
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbtest-'));
    process.env.DB_PATH = path.join(tmpDir, 'data.db');
    jest.resetModules();
    funcs = require('../index');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  test('applyCustomEmojis replaces known emojis', () => {
    const db = require('../db');
    db.addUser('alice', 'pw');
    const { getStore, applyCustomEmojis } = funcs;
    getStore('alice').emojis = { '😀': '1' };
    const res = applyCustomEmojis('Hi 😀', 'alice');
    expect(res).toBe('Hi <tg-emoji emoji-id="1">😀</tg-emoji>');
  });

  test('applyCustomEmojisWithInfo returns replaced list', () => {
    const db = require('../db');
    db.addUser('bob', 'pw');
    const { getStore, applyCustomEmojisWithInfo } = funcs;
    getStore('bob').emojis = { '😀': '1' };
    const out = applyCustomEmojisWithInfo('Hi 😀', 'bob');
    expect(out.text).toBe('Hi <tg-emoji emoji-id="1">😀</tg-emoji>');
    expect(out.replaced).toEqual(['😀']);
  });

  test('parseEmojiPack builds map from message', () => {
    const { parseEmojiPack } = funcs;
    const text = ':smile: - a\n:heart: - b';
    const entities = [
      { type: 'custom_emoji', offset: 10, length: 1, custom_emoji_id: 'id1' },
      { type: 'custom_emoji', offset: 22, length: 1, custom_emoji_id: 'id2' },
    ];
    const result = parseEmojiPack({ text, entities });
    expect(result[':smile:']).toBe('id1');
    expect(result['😄']).toBe('id1');
    expect(result[':heart:']).toBe('id2');
    expect(result['❤️']).toBe('id2');
  });
});
