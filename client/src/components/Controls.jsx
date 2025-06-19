import PropTypes from 'prop-types'

export default function Controls({ startGet, startPost, stop }) {
  return (
    <div className="controls">
      <button onClick={startGet}>Start Getting</button>
      <button onClick={startPost}>Start Posting</button>
      <button onClick={stop}>Stop</button>
    </div>
  )
}

Controls.propTypes = {
  startGet: PropTypes.func.isRequired,
  startPost: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired
}
