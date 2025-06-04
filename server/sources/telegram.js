const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');

const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION;

let clientPromise;

async function getClient() {
  if (!clientPromise) {
    if (!apiId || !apiHash || !sessionString) {
      throw new Error('Telegram credentials are not fully provided');
    }
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'tg-news-creator',
      systemVersion: process.version,
      appVersion: '2.0'
    });
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

async function fetchChannelMessages(channel) {
  const client = await getClient();
  const peer = await client.getInputEntity(channel);
  const history = await client.invoke(new Api.messages.GetHistory({ peer, limit: 50 }));
  return history.messages
    .filter(m => m.message)
    .map(m => ({
      title: m.message.slice(0, 80),
      url: `https://t.me/${channel.replace(/^@/, '')}/${m.id}`,
      publishedAt: m.date?.toISOString ? m.date.toISOString() : new Date(m.date * 1000).toISOString(),
      text: m.message,
      image: null
    }));
}

module.exports = fetchChannelMessages;
