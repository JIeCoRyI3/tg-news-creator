/**
 * Dropdown component used to choose an Author GPT profile for rewriting
 * posts.
 */
import PropTypes from 'prop-types'

/**
 * Choose an author from the provided list.
 */
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
