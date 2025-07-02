import { useState, useEffect } from 'react'
import Instance from './Instance.jsx'
import Button from './components/ui/Button.jsx'
import './App.css'

export default function App() {
  const [title, setTitle] = useState('')
  const [instances, setInstances] = useState([])

  useEffect(() => {
    fetch('http://localhost:3001/api/instances')
      .then(r => r.json())
      .then(data => setInstances(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const add = () => {
    const t = title.trim()
    if (!t) return
    fetch('http://localhost:3001/api/instances', {
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

  return (
    <div className="App">
      <h2>Instances</h2>
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
