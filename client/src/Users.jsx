import { useState, useEffect } from 'react'
import Button from './components/ui/Button.jsx'

export default function Users() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState([])

  const load = () => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(load, [])

  const addUser = () => {
    if (!login.trim() || !password.trim()) return
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), password: password.trim() })
    }).then(() => {
      setLogin('')
      setPassword('')
      load()
    }).catch(() => {})
  }

  const deleteUser = (name) => {
    fetch(`/api/users/${name}`, { method: 'DELETE' })
      .then(load).catch(() => {})
  }

  return (
    <div className="users-page">
      <h3>Users</h3>
      <div className="tg-input">
        <input value={login} onChange={e => setLogin(e.target.value)} placeholder="login" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
        <Button onClick={addUser}>Add User</Button>
      </div>
      <ul>
        {accounts.map(u => (
          <li key={u}><span>{u}</span> <Button onClick={() => deleteUser(u)}>x</Button></li>
        ))}
      </ul>
    </div>
  )
}
