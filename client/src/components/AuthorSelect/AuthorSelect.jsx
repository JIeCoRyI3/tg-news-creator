/**
 * Dropdown for selecting an Author GPT profile.  The list is provided by the
 * parent component and contains objects with `id` and `title` properties.
 */
import PropTypes from 'prop-types'

/**
 * Render a `<select>` element for choosing an author.  The currently selected
 * author id is stored in `selected`.
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
