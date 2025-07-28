/**
 * Switch between JSON and rendered view modes for scraped posts.
 */
import PropTypes from 'prop-types'

/**
 * Render radio buttons for toggling the post display mode.
 */
export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="mode-toggle">
      <label>
        <input type="radio" checked={mode === 'json'} onChange={() => setMode('json')} /> JSON
      </label>
      <label>
        <input type="radio" checked={mode === 'render'} onChange={() => setMode('render')} /> Render
      </label>
    </div>
  )
}

ModeToggle.propTypes = {
  mode: PropTypes.oneOf(['json', 'render']).isRequired,
  setMode: PropTypes.func.isRequired
}
