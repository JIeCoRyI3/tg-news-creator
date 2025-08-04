const { createEmojiUtils } = require('../emoji');

describe('emoji utilities', () => {
  const getStore = () => ({ emojis: { '😄': '123' } });
  const { applyCustomEmojis, applyCustomEmojisWithInfo, parseEmojiPack } = createEmojiUtils(getStore);

  test('applyCustomEmojis replaces known emoji', () => {
    const out = applyCustomEmojis('hi 😄', 'user');
    expect(out).toBe('hi <tg-emoji emoji-id="123">😄</tg-emoji>');
  });

  test('applyCustomEmojisWithInfo reports replacements', () => {
    const res = applyCustomEmojisWithInfo('ok 😄', 'user');
    expect(res).toEqual({ text: 'ok <tg-emoji emoji-id="123">😄</tg-emoji>', replaced: ['😄'] });
  });

  test('parseEmojiPack extracts mapping', () => {
    const msg = {
      text: ':smile: - 😀',
      entities: [{ type: 'custom_emoji', offset: 10, custom_emoji_id: 'abc' }]
    };
    const map = parseEmojiPack(msg);
    expect(map[':smile:']).toBe('abc');
    expect(map['😄']).toBe('abc');
  });
});
