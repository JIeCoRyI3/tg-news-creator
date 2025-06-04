import PropTypes from 'prop-types'

export default function Controls({ start, stop }) {
  return (
    <div className="controls">
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  )
}

Controls.propTypes = {
  start: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired
}
