import { useState, useEffect } from 'react'
import Instance from './Instance.jsx'
import Button from './components/ui/Button.jsx'
import Login from './Login.jsx'
import './App.css'

export default function App() {
  const [title, setTitle] = useState('')
  const [instances, setInstances] = useState([])
  const [user, setUser] = useState(null)

  const loadUser = () => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }

  useEffect(loadUser, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/instances')
      .then(r => r.json())
      .then(data => setInstances(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user])

  const add = () => {
    const t = title.trim()
    if (!t) return
    fetch('/api/instances', {
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

  if (!user) return <Login onLogin={loadUser} />

  const logout = () => {
    fetch('/api/logout').finally(() => setUser(null))
  }

  return (
    <div className="App">
      <div className="header">
        <h2>Instances</h2>
        <Button onClick={logout}>Logout</Button>
      </div>
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
    </div>
  )
}
