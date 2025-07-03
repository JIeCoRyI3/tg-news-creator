import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from './ui/Button.jsx'
import Modal from './ui/Modal.jsx'

export default function AdminTab({ instanceId, onDelete }) {
  const [username, setUsername] = useState('')
  const [users, setUsers] = useState([])
  const [queue, setQueue] = useState([])
  const [channelLink, setChannelLink] = useState('')
  const [channels, setChannels] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = () => {
    fetch(`/api/instances/${instanceId}/approvers`)
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch('/api/awaiting')
      .then(r => r.json())
      .then(data => setQueue(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch(`/api/instances/${instanceId}/post-channels`)
      .then(r => r.json())
      .then(data => {
        const arr = Object.entries(data).map(([cid, info]) => ({ id: cid, ...info }))
        setChannels(arr)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  const add = () => {
    if (!username.trim()) return
    fetch(`/api/instances/${instanceId}/approvers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() })
    }).then(() => {
      setUsername('')
      load()
    }).catch(() => {})
  }

  const addPostChannel = () => {
    if (!channelLink.trim()) return
    fetch(`/api/instances/${instanceId}/post-channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: channelLink.trim() })
    }).then(() => {
      setChannelLink('')
      load()
    }).catch(() => {})
  }

  const remove = (name) => {
    fetch(`/api/instances/${instanceId}/approvers?username=${name}`, {
      method: 'DELETE'
    }).then(load).catch(() => {})
  }

  const approve = (id) => {
    fetch(`/api/awaiting/${id}/approve`, { method: 'POST' })
      .then(load).catch(() => {})
  }

  const cancel = (id) => {
    fetch(`/api/awaiting/${id}/cancel`, { method: 'POST' })
      .then(load).catch(() => {})
  }

  const doDelete = () => {
    fetch(`/api/instances/${instanceId}`, { method: 'DELETE' })
      .then(() => {
        setConfirmDelete(false)
        if (onDelete) onDelete()
      })
      .catch(() => setConfirmDelete(false))
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
      <h4>Posting Channels</h4>
      <div className="tg-input">
        <input value={channelLink} onChange={e => setChannelLink(e.target.value)} placeholder="https://t.me/channel" />
        <Button onClick={addPostChannel}>Add posting channel</Button>
      </div>
      <ul>
        {channels.map(c => (
          <li key={c.id}>{c.username || c.title}</li>
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
      <Button onClick={() => setConfirmDelete(true)}>Delete instance</Button>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        actions={<Button onClick={doDelete}>Delete</Button>}
      >
        Are you sure you want to delete this instance?
      </Modal>
    </div>
  )
}

AdminTab.propTypes = {
  instanceId: PropTypes.string.isRequired,
  onDelete: PropTypes.func
}
