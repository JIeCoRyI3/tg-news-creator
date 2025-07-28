/**
 * Tab for managing Author GPT configurations.  Allows creating new authors and
 * uploading training files which are stored in an OpenAI vector store.
 */
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import apiFetch from '../../api.js'

/**
 * Display a list of authors and a form for creating new ones.  The post suffix
 * textarea allows appending HTML to every post generated using the selected
 * author profile.
 */
export default function AuthorsTab({ authors, setAuthors, postSuffix, setPostSuffix }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [models, setModels] = useState([])
  const [instructions, setInstructions] = useState('')
  const [_files, setFiles] = useState([])
  const [vectorId, setVectorId] = useState(null)
  const [openAuthor, setOpenAuthor] = useState(null)

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
    if (vectorId) fd.append('vector_store_id', vectorId)
    apiFetch('/api/authors', {
      method: 'POST',
      body: fd
    })
      .then(r => r.json())
      .then(data => {
        setAuthors(prev => [...prev, data])
        setShowForm(false)
        setTitle('')
        setInstructions('')
        setFiles([])
        setVectorId(null)
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
      <div className="tg-input">
        <textarea
          value={postSuffix}
          onChange={e => setPostSuffix(e.target.value)}
          placeholder="HTML snippet to append to each post"
          rows={2}
        />
      </div>
      <ul>
        {authors.map(a => (
          <li key={a.id}>
            <span onClick={() => setOpenAuthor(a)} style={{ cursor: 'pointer' }}>
              {a.title}
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
          <input type="file" multiple onChange={e => uploadFiles(Array.from(e.target.files))} />
          <Button onClick={create}>Save</Button>
          <Button onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)}>Create an author</Button>
      )}
      <Modal
        open={!!openAuthor}
        onClose={() => setOpenAuthor(null)}
      >
        {openAuthor && (
          <div>
            <h4>{openAuthor.title}</h4>
            <div>Model: {openAuthor.model}</div>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{openAuthor.instructions}</pre>
          </div>
        )}
      </Modal>
    </div>
  )
}

AuthorsTab.propTypes = {
  authors: PropTypes.arrayOf(PropTypes.object).isRequired,
  setAuthors: PropTypes.func.isRequired,
  postSuffix: PropTypes.string.isRequired,
  setPostSuffix: PropTypes.func.isRequired
}
