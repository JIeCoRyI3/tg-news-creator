/**
 * Simple scrolling log output used by the Instance page to display status
 * messages from the server.  Each log entry is rendered as a separate div so
 * the container can be styled with fixed height and overflow scrolling.
 */
import PropTypes from 'prop-types'

/**
 * Render a list of log messages.
 */
export default function Logs({ logs }) {
  return (
    <div className="logs" role="log">
      {logs.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  )
}

Logs.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.string).isRequired
}
