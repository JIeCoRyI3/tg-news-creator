import PropTypes from 'prop-types'

export default function ChannelSelect({ channels, selected, setSelected }) {
  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }
  return (
    <div className="channel-select">
      {channels.map(c => (
        <label key={c.id}>
          <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
          {c.username || c.title}
        </label>
      ))}
    </div>
  )
}

ChannelSelect.propTypes = {
  channels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    username: PropTypes.string,
  })).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelected: PropTypes.func.isRequired,
}
