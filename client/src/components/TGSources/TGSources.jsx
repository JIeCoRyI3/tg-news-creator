/**
 * Form allowing entry of Telegram channel URLs to scrape.
 */
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import apiFetch from '../../api.js'

/**
 * Manage the list of Telegram source URLs.
 */
export default function TGSources({ urls, addUrl, removeUrl }) {
  const [value, setValue] = useState('')
  const [info, setInfo] = useState({})
  const [open, setOpen] = useState(null)

  useEffect(() => {
    for (const url of urls) {
      if (!info[url]) {
        apiFetch(`/api/tg-source-info?url=${encodeURIComponent(url)}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && data.title) {
              setInfo(prev => ({ ...prev, [url]: data }))
            }
          })
          .catch(() => {})
      }
    }
  }, [urls])
  const onAdd = () => {
    if (!value.trim()) return
    addUrl(value.trim())
    setValue('')
  }
  return (
    <div className="tg-sources">
      <div className="tg-input">
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="https://t.me/s/channel" />
        <Button onClick={onAdd}>Add</Button>
      </div>
      <ul>
        {urls.map(u => {
          const i = info[u] || {}
          return (
            <li key={u}>
              {i.image && <img src={i.image} alt="" onClick={() => setOpen(u)} />}
              <span onClick={() => setOpen(u)}>{i.title || u}</span>
              <Button onClick={() => removeUrl(u)}>Delete</Button>
            </li>
          )
        })}
      </ul>
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        actions={open && (
          <Button onClick={() => { removeUrl(open); setOpen(null) }}>Delete</Button>
        )}
      >
        {open && (
          <div className="tg-source-info">
            {info[open]?.image && <img src={info[open].image} alt="" />}
            <h4>{info[open]?.title || open}</h4>
            <a href={open} target="_blank" rel="noopener noreferrer">{open}</a>
          </div>
        )}
      </Modal>
    </div>
  )
}

TGSources.propTypes = {
  urls: PropTypes.arrayOf(PropTypes.string).isRequired,
  addUrl: PropTypes.func.isRequired,
  removeUrl: PropTypes.func.isRequired
}
