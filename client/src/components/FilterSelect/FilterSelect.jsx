/**
 * Dropdown select for choosing which content filter to apply to scraped posts.
 */
import PropTypes from 'prop-types'

/**
 * Render the filter selection control.
 */
export default function FilterSelect({ filters, selected, setSelected }) {
  return (
    <div className="filter-select">
      <select value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="none">No Filter</option>
        {filters.map(f => (
          <option key={f.id} value={f.id}>{f.title}</option>
        ))}
      </select>
    </div>
  )
}

FilterSelect.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.string.isRequired,
  setSelected: PropTypes.func.isRequired
}
