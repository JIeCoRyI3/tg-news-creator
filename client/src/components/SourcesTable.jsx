import PropTypes from 'prop-types'

export default function SourcesTable({ sources, selected, toggle, statuses = {} }) {
  return (
    <table className="sources">
      <tbody>
        {Object.entries(sources).map(([id, name]) => {
          const status = statuses[id]
          return (
            <tr key={id} onClick={() => toggle(id)} className={selected.includes(id) ? 'selected' : ''}>
              <td>{name}</td>
              <td>{status?.status === 'connected' ? 'Connected' : ''}</td>
              <td>{status?.lastPing ? Math.round((Date.now() - status.lastPing) / 1000) : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

SourcesTable.propTypes = {
  sources: PropTypes.object.isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggle: PropTypes.func.isRequired,
  statuses: PropTypes.object
}
