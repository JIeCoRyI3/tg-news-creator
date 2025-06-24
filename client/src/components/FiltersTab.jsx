import { useState } from 'react'
import PropTypes from 'prop-types'

export default function FiltersTab({ filters, setFilters }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [instructions, setInstructions] = useState('')
  const [files, setFiles] = useState([])

  const create = () => {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('model', model)
    fd.append('instructions', instructions)
    files.forEach(f => fd.append('attachments', f))
    fetch('http://localhost:3001/api/filters', {
      method: 'POST',
      body: fd
    })
      .then(r => r.json())
      .then(data => {
        setFilters(prev => [...prev, data])
        setShowForm(false)
        setTitle('')
        setInstructions('')
        setFiles([])
      })
      .catch(() => {})
  }

  return (
    <div className="filters-tab">
      <ul>
        {filters.map(f => (
          <li key={f.id}>{f.title}</li>
        ))}
      </ul>
      {showForm ? (
        <div className="filter-form">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
          <select value={model} onChange={e => setModel(e.target.value)}>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
          </select>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instructions" />
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} />
          <button onClick={create}>Save</button>
          <button onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}>Create a filter</button>
      )}
    </div>
  )
}

FiltersTab.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object).isRequired,
  setFilters: PropTypes.func.isRequired
}
