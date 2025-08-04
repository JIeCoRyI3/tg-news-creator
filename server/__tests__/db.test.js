const db = require('../db');

describe('db helpers', () => {
  const login = 'jest-user';

  afterEach(() => {
    try { db.deleteUser(login); } catch (e) {}
  });

  test('addUser and getUsers', () => {
    db.addUser(login, 'pass');
    const users = db.getUsers();
    expect(users.find(u => u.login === login).password).toBe('pass');
  });

  test('setData and getData', () => {
    db.addUser(login, 'p');
    db.setData(login, 'test', { a: 1 });
    expect(db.getData(login, 'test')).toEqual({ a: 1 });
  });

  test('deleteUser removes data', () => {
    db.addUser(login, 'p');
    db.setData(login, 'test', { a: 1 });
    db.deleteUser(login);
    const users = db.getUsers();
    expect(users.some(u => u.login === login)).toBe(false);
    expect(db.getData(login, 'test')).toBeNull();
  });
});
