import { useState, useEffect } from 'react'
import apiFetch from './api.js'
import Instance from './Instance.jsx'
import Users from './Users.jsx'
import Button from './components/ui/Button.jsx'
import Login from './Login.jsx'
import './App.css'

export default function App() {
  const [title, setTitle] = useState('')
  const [instances, setInstances] = useState([])
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')

  const loadUser = () => {
    console.log('Fetching /api/me')
    apiFetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        console.log('Current user', data)
        setUser(data)
      })
      .catch(err => {
        console.log('Failed loading user', err)
        setUser(null)
      })
  }

  useEffect(() => {
    if (localStorage.getItem('access-token')) loadUser()
  }, [])

  useEffect(() => {
    console.log('User state changed', user)
  }, [user])

  useEffect(() => {
    if (!user) return
    apiFetch('/api/instances')
      .then(r => r.json())
      .then(data => setInstances(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user])

  const add = () => {
    const t = title.trim()
    if (!t) return
    apiFetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t })
    })
      .then(r => r.json())
      .then(inst => setInstances(prev => [...prev, inst]))
      .catch(() => {})
    setTitle('')
  }

  const removeInstance = (instId) => {
    setInstances(prev => prev.filter(i => i.id !== instId))
  }

  if (!user) {
    console.log('Displaying login page')
    return <Login onLogin={loadUser} />
  }

  const logout = () => {
    console.log('Logging out')
    apiFetch('/api/logout').finally(() => {
      localStorage.removeItem('access-token')
      setUser(null)
      console.log('Logged out')
    })
  }

  return (
    <div className="App">
      <div className="header">
        <div className="nav">
          <Button onClick={() => setPage('dashboard')} className={page === 'dashboard' ? 'active' : ''}>Dashboard</Button>
          <Button onClick={() => setPage('users')} className={page === 'users' ? 'active' : ''}>Users</Button>
        </div>
        <Button onClick={logout}>Logout</Button>
      </div>
      {page === 'dashboard' ? (
        <>
          <div className="tg-input">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Instance title" />
            <Button onClick={add}>Add new instance</Button>
          </div>
          {instances.map(inst => (
            <Instance
              key={inst.id}
              id={inst.id}
              title={inst.title}
              onDelete={() => removeInstance(inst.id)}
            />
          ))}
        </>
      ) : (
        <Users />
      )}
    </div>
  )
}
