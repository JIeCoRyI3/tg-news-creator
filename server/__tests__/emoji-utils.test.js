const { applyCustomEmojis, applyCustomEmojisWithInfo, parseEmojiPack } = require('../emoji-utils');

describe('emoji utilities', () => {
  test('applyCustomEmojis replaces emoji with custom tag', () => {
    const map = { '😄': '123' };
    const result = applyCustomEmojis('Hello 😄', map);
    expect(result).toBe('Hello <tg-emoji emoji-id="123">😄</tg-emoji>');
  });

  test('applyCustomEmojisWithInfo returns replaced list', () => {
    const map = { '😄': '123' };
    const result = applyCustomEmojisWithInfo('Hi 😄!', map);
    expect(result).toEqual({
      text: 'Hi <tg-emoji emoji-id="123">😄</tg-emoji>!',
      replaced: ['😄']
    });
  });

  test('parseEmojiPack maps aliases and emoji', () => {
    const msg = {
      text: ':smile: - x',
      entities: [
        { type: 'custom_emoji', offset: 10, length: 1, custom_emoji_id: 'abc' }
      ]
    };
    const map = parseEmojiPack(msg);
    expect(map[':smile:']).toBe('abc');
    expect(map['😄']).toBe('abc');
  });
});
