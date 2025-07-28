const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  const users = db.getUsers();
  const result = {};
  for (const u of users) {
    result[u.login] = {};
    const types = ['instances','tgSources','filters','authors','emojis','adminChannels','approvers'];
    for (const t of types) {
      const data = db.getData(u.login, t);
      if (data) result[u.login][t] = data;
    }
  }
  res.send(`<pre>${JSON.stringify(result, null, 2)}</pre>`);
});

app.listen(PORT, () => {
  console.log(`Database visualiser running at http://localhost:${PORT}`);
});
