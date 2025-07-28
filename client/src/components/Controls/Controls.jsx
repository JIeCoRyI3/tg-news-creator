/**
 * Simple set of buttons used to start/stop scraping and posting.
 */
import PropTypes from 'prop-types'
import Button from '../ui/Button.jsx'

/**
 * Display buttons for controlling background tasks.
 */
export default function Controls({ startGet, startPost, stop, startLabel = 'Start Getting', disabled = false }) {
  return (
    <div className="controls">
      <Button onClick={startGet} disabled={disabled}>{startLabel}</Button>
      <Button onClick={startPost} disabled={disabled}>Start Posting</Button>
      <Button onClick={stop} disabled={disabled}>Stop</Button>
    </div>
  )
}

Controls.propTypes = {
  startGet: PropTypes.func.isRequired,
  startPost: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired,
  startLabel: PropTypes.string,
  disabled: PropTypes.bool
}
