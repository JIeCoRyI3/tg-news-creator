const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// Initialize tables
// users table
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  login TEXT PRIMARY KEY,
  password TEXT NOT NULL
)` ).run();

// generic key/value store per user
// key is data type (instances, authors, filters, etc)
db.prepare(`CREATE TABLE IF NOT EXISTS user_data (
  login TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT,
  PRIMARY KEY (login, type),
  FOREIGN KEY (login) REFERENCES users(login) ON DELETE CASCADE
)` ).run();

module.exports = {
  getUsers() {
    return db.prepare('SELECT login,password FROM users').all();
  },
  addUser(login, password) {
    db.prepare('INSERT INTO users (login,password) VALUES (?,?)').run(login, password);
  },
  deleteUser(login) {
    db.prepare('DELETE FROM users WHERE login=?').run(login);
    db.prepare('DELETE FROM user_data WHERE login=?').run(login);
  },
  getData(login, type) {
    const row = db.prepare('SELECT data FROM user_data WHERE login=? AND type=?').get(login, type);
    return row ? JSON.parse(row.data) : null;
  },
  setData(login, type, value) {
    const data = JSON.stringify(value);
    db.prepare('INSERT INTO user_data (login,type,data) VALUES (?,?,?) ON CONFLICT(login,type) DO UPDATE SET data=excluded.data').run(login, type, data);
  }
};
