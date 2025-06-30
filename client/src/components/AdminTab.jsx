import { useState, useEffect } from 'react'

export default function AdminTab() {
  const [username, setUsername] = useState('')
  const [users, setUsers] = useState([])
  const [queue, setQueue] = useState([])

  const load = () => {
    fetch('http://localhost:3001/api/approvers')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch('http://localhost:3001/api/awaiting')
      .then(r => r.json())
      .then(data => setQueue(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  const add = () => {
    if (!username.trim()) return
    fetch('http://localhost:3001/api/approvers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() })
    }).then(() => {
      setUsername('')
      load()
    }).catch(() => {})
  }

  const remove = (name) => {
    fetch(`http://localhost:3001/api/approvers?username=${name}`, {
      method: 'DELETE'
    }).then(load).catch(() => {})
  }

  const approve = (id) => {
    fetch(`http://localhost:3001/api/awaiting/${id}/approve`, { method: 'POST' })
      .then(load).catch(() => {})
  }

  const cancel = (id) => {
    fetch(`http://localhost:3001/api/awaiting/${id}/cancel`, { method: 'POST' })
      .then(load).catch(() => {})
  }

  return (
    <div className="admin-tab">
      <div className="tg-input">
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" />
        <button onClick={add}>Add Approver</button>
      </div>
      <ul>
        {users.map(u => (
          <li key={u}><span>{u}</span> <button onClick={() => remove(u)}>x</button></li>
        ))}
      </ul>
      <h4>Awaiting Approval</h4>
      <ul>
        {queue.map(p => (
          <li key={p.id}>
            <div>{p.channel}</div>
            <div>{p.text?.slice(0, 100)}</div>
            {p.media && <img src={p.media} alt="" />}
            <button onClick={() => approve(p.id)}>Approve</button>
            <button onClick={() => cancel(p.id)}>Cancel</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
