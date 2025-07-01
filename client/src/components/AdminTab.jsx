import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from './ui/Button.jsx'

export default function AdminTab({ instanceId }) {
  const [username, setUsername] = useState('')
  const [users, setUsers] = useState([])
  const [queue, setQueue] = useState([])

  const load = () => {
    fetch(`http://localhost:3001/api/instances/${instanceId}/approvers`)
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
    fetch(`http://localhost:3001/api/instances/${instanceId}/approvers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() })
    }).then(() => {
      setUsername('')
      load()
    }).catch(() => {})
  }

  const remove = (name) => {
    fetch(`http://localhost:3001/api/instances/${instanceId}/approvers?username=${name}`, {
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
        <Button onClick={add}>Add Approver</Button>
      </div>
      <ul>
        {users.map(u => (
          <li key={u}><span>{u}</span> <Button onClick={() => remove(u)}>x</Button></li>
        ))}
      </ul>
      <h4>Awaiting Approval</h4>
      <ul>
        {queue.map(p => (
          <li key={p.id}>
            <div>{p.channel}</div>
            <div>{p.text?.slice(0, 100)}</div>
            {p.media && <img src={p.media} alt="" />}
            <Button onClick={() => approve(p.id)}>Approve</Button>
            <Button onClick={() => cancel(p.id)}>Cancel</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

AdminTab.propTypes = {
  instanceId: PropTypes.string.isRequired
}
