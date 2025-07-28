/**
 * Small group of buttons used to start scraping, start posting and stop the
 * current operation.  The parent component wires the callbacks.
 */
import PropTypes from 'prop-types'
import Button from '../ui/Button.jsx'

/**
 * Render the control buttons for an instance.  `startGet` begins scraping,
 * `startPost` posts new items and `stop` halts the process.
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
