import PropTypes from 'prop-types'

export default function TelegramInput({ channelUrl, setChannelUrl, addChannel }) {
  return (
    <div className="tg-input">
      <input value={channelUrl} onChange={e => setChannelUrl(e.target.value)} placeholder="Telegram channel link" />
      <button onClick={addChannel}>Add</button>
    </div>
  )
}

TelegramInput.propTypes = {
  channelUrl: PropTypes.string.isRequired,
  setChannelUrl: PropTypes.func.isRequired,
  addChannel: PropTypes.func.isRequired
}
