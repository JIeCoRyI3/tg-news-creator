import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import apiFetch from '../../api.js'

export default function FiltersTab({ filters, setFilters }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [models, setModels] = useState([])
  const [instructions, setInstructions] = useState('')
  const [_files, setFiles] = useState([])
  const [vectorId, setVectorId] = useState(null)
  const [minScore, setMinScore] = useState(7)
  const [openFilter, setOpenFilter] = useState(null)

  useEffect(() => {
    apiFetch('/api/models')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setModels(data)
          setModel(data[0])
        }
      })
      .catch(() => {})
  }, [])

  const create = () => {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('model', model)
    fd.append('instructions', instructions)
    fd.append('min_score', minScore)
    if (vectorId) fd.append('vector_store_id', vectorId)
    apiFetch('/api/filters', {
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
        setVectorId(null)
        setMinScore(7)
      })
      .catch(() => {})
  }

  const uploadFiles = (selected) => {
    setFiles(selected)
    if (selected.length === 0) {
      setVectorId(null)
      return
    }
    const fd = new FormData()
    selected.forEach(f => fd.append('attachments', f))
    apiFetch('/api/vector-stores', {
      method: 'POST',
      body: fd
    })
      .then(r => r.json())
      .then(data => {
        setVectorId(data.id)
      })
      .catch(() => {})
  }

  return (
    <div className="filters-tab">
      <ul>
        {filters.map(f => (
          <li key={f.id}>
            <span onClick={() => setOpenFilter(f)} style={{ cursor: 'pointer' }}>
              {f.title}
            </span>
          </li>
        ))}
      </ul>
      {showForm ? (
        <div className="filter-form">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
          <select value={model} onChange={e => setModel(e.target.value)}>
            {models.length === 0 ? (
              <>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
              </>
            ) : (
              models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))
            )}
          </select>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instructions" />
          <input type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))} placeholder="Min score" />
          <input type="file" multiple onChange={e => uploadFiles(Array.from(e.target.files))} />
          <Button onClick={create}>Save</Button>
          <Button onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)}>Create a filter</Button>
      )}
      <Modal
        open={!!openFilter}
        onClose={() => setOpenFilter(null)}
        actions={openFilter && (
          <Button onClick={() => {
            apiFetch(`/api/filters/${openFilter.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ min_score: openFilter.min_score })
            }).then(r => r.json())
              .then(data => {
                setFilters(prev => prev.map(f => f.id === data.id ? data : f))
                setOpenFilter(null)
              }).catch(() => {})
          }}>Save</Button>
        )}
      >
        {openFilter && (
          <div>
            <h4>{openFilter.title}</h4>
            <div>Model: {openFilter.model}</div>
            <div>
              Min score: <input type="number" value={openFilter.min_score} onChange={e => setOpenFilter({ ...openFilter, min_score: Number(e.target.value) })} />
            </div>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{openFilter.instructions}</pre>
          </div>
        )}
      </Modal>
    </div>
  )
}

FiltersTab.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object).isRequired,
  setFilters: PropTypes.func.isRequired
}
