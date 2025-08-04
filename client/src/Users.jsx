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

  /**
   * Retrieve the list of user accounts from the server and store them
   * locally.
   */
  const load = () => {
    apiFetch('/api/users')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(load, [])

  /**
   * Create a new user account using the provided login and password
   * fields, then refresh the user list.
   */
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

  /**
   * Remove a user account by login name.
   */
  const deleteUser = (name) => {
    apiFetch(`/api/users/${name}`, { method: 'DELETE' })
      .then(load)
      .catch(() => {})
  }

  /**
   * Trigger the hidden file input to import data dumps.
   */
  const importData = () => {
    fileInput.current?.click()
  }

  /**
   * Upload selected JSON files to the server for import.
   */
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
