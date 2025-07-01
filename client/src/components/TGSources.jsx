import { useState } from 'react'
import PropTypes from 'prop-types'
import Button from './ui/Button.jsx'

export default function TGSources({ urls, addUrl, removeUrl }) {
  const [value, setValue] = useState('')
  const onAdd = () => {
    if (!value.trim()) return
    addUrl(value.trim())
    setValue('')
  }
  return (
    <div className="tg-sources">
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="https://t.me/s/channel" />
      <Button onClick={onAdd}>Add</Button>
      <ul>
        {urls.map(u => (
          <li key={u}>
            {u} <Button onClick={() => removeUrl(u)}>x</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

TGSources.propTypes = {
  urls: PropTypes.arrayOf(PropTypes.string).isRequired,
  addUrl: PropTypes.func.isRequired,
  removeUrl: PropTypes.func.isRequired
}
