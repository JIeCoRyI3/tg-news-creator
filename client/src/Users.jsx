/**
 * Administration page allowing management of user accounts.
 */
import { useState, useEffect, useRef } from 'react'
import Button from './components/ui/Button.jsx'
import Icon from './components/ui/Icon.jsx'
// Import icons from our local definitions
import { faPlus, faTrash } from './icons.js'
import apiFetch from './api.js'

/**
 * User management page.  Displays a list of accounts returned from
 * `/api/users` and provides a simple form for adding new users.  Each
 * account row includes a button to delete that user.  The page uses the
 * modern dashboard styles for a consistent look and feel.
 */
export default function Users({ user }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState([])
  const fileInput = useRef(null)

  const load = () => {
    apiFetch('/api/users')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(load, [])

  const addUser = () => {
    if (!login.trim() || !password.trim()) return
    apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), password: password.trim() })
    })
      .then(() => {
        setLogin('')
        setPassword('')
        load()
      })
      .catch(() => {})
  }

  const deleteUser = (name) => {
    apiFetch(`/api/users/${name}`, { method: 'DELETE' })
      .then(load)
      .catch(() => {})
  }

  const importData = () => {
    fileInput.current?.click()
  }

  const onFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    apiFetch('/api/import-data', { method: 'POST', body: fd })
      .then(() => { e.target.value = '' })
      .catch(() => {})
  }

  return (
    <div className="users-page">
      <div>
        <h1>Users</h1>
        <div className="add-user-form">
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Login"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <Button onClick={addUser}>
            <Icon iconDef={faPlus} className="btn-icon" />
            <span>Add User</span>
          </Button>
        </div>
        <ul className="users-list">
          {accounts.map(u => (
            <li key={u} className="user-item">
              <span>{u}</span>
              <Button variant="danger" onClick={() => deleteUser(u)}>
                <Icon iconDef={faTrash} className="btn-icon" />
                <span>Delete</span>
              </Button>
            </li>
          ))}
        </ul>
        {user?.login === 'root' && (
          <>
            <Button onClick={importData}>Import data</Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="application/json"
              style={{ display: 'none' }}
              onChange={onFiles}
            />
          </>
        )}
      </div>
    </div>
  )
}
