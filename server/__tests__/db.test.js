const fs = require('fs');
const os = require('os');
const path = require('path');

describe('db module', () => {
  let db;
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbtest-'));
    process.env.DB_PATH = path.join(tmpDir, 'data.db');
    jest.resetModules();
    db = require('../db');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  test('addUser and getUsers', () => {
    expect(db.getUsers()).toEqual([]);
    db.addUser('alice', 'secret');
    expect(db.getUsers()).toEqual([{ login: 'alice', password: 'secret' }]);
  });

  test('setData and getData', () => {
    db.addUser('bob', 'pwd');
    expect(db.getData('bob', 'filters')).toBeNull();
    db.setData('bob', 'filters', { a: 1 });
    expect(db.getData('bob', 'filters')).toEqual({ a: 1 });
  });

  test('deleteUser removes associated data', () => {
    db.addUser('carol', 'pwd');
    db.setData('carol', 'x', { v: 1 });
    db.deleteUser('carol');
    expect(db.getUsers()).toEqual([]);
    expect(db.getData('carol', 'x')).toBeNull();
  });
});
