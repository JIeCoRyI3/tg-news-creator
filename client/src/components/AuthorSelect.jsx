import PropTypes from 'prop-types'

export default function AuthorSelect({ authors, selected, setSelected }) {
  return (
    <div className="author-select">
      <select value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="none">No Author</option>
        {authors.map(a => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>
    </div>
  )
}

AuthorSelect.propTypes = {
  authors: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.string.isRequired,
  setSelected: PropTypes.func.isRequired
}
