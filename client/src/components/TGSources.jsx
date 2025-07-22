import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from './ui/Button.jsx'
import apiFetch from '../api.js'

export default function TGSources({ urls, addUrl, removeUrl }) {
  const [value, setValue] = useState('')
  const [info, setInfo] = useState({})

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
              {i.image && <img src={i.image} alt="" />}
              <span>{i.title || u}</span>
              <Button onClick={() => removeUrl(u)}>Delete</Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

TGSources.propTypes = {
  urls: PropTypes.arrayOf(PropTypes.string).isRequired,
  addUrl: PropTypes.func.isRequired,
  removeUrl: PropTypes.func.isRequired
}
