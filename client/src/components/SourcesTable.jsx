import PropTypes from 'prop-types'

export default function SourcesTable({ sources, selected, toggle, statuses }) {
  return (
    <table className="sources">
      <thead>
        <tr>
          <th>Source</th>
          <th>Status</th>
          <th>Ping (s)</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(sources).map(([id, label]) => (
          <tr key={id} onClick={() => toggle(id)} className={selected.includes(id) ? 'selected' : ''}>
            <td>{label}</td>
            <td className={`status ${statuses[id]?.status}`}>{statuses[id]?.status === 'connected' ? 'Connected' : statuses[id]?.status === 'error' ? 'Error' : ''}</td>
            <td>{statuses[id]?.lastPing ? Math.floor((Date.now() - statuses[id].lastPing)/1000) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

SourcesTable.propTypes = {
  sources: PropTypes.object.isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggle: PropTypes.func.isRequired,
  statuses: PropTypes.object.isRequired
}
