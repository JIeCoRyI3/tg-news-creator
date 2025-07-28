import PropTypes from 'prop-types'

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
