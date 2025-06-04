const path = require('node:path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

// Load environment variables from .env in this directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

(async () => {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) {
    console.log('Please set TELEGRAM_API_ID and TELEGRAM_API_HASH');
    return;
  }
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: 'tg-news-creator',
    systemVersion: process.version,
    appVersion: '2.0'
  });
  await client.start({
    phoneNumber: async () => await ask('Phone number: '),
    password: async () => await ask('Password (if any): '),
    phoneCode: async () => await ask('Code: '),
    onError: err => console.log(err),
  });
  console.log('Your session string. Save it in TELEGRAM_SESSION:');
  console.log(client.session.save());
  await client.disconnect();
})();
