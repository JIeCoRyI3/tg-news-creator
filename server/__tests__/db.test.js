import { describe, it, expect, afterEach } from 'vitest'
import db from '../db.js'

const login = 'vitest-user'

afterEach(() => {
  db.deleteUser(login)
})

describe('db module', () => {
  it('adds and retrieves users', () => {
    db.addUser(login, 'secret')
    const users = db.getUsers()
    expect(users.some(u => u.login === login && u.password === 'secret')).toBe(true)
  })

  it('stores and fetches user data', () => {
    db.addUser(login, 'secret')
    db.setData(login, 'prefs', { theme: 'dark' })
    const data = db.getData(login, 'prefs')
    expect(data).toEqual({ theme: 'dark' })
  })
})
