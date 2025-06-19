import PropTypes from 'prop-types'

export default function NewsItem({ item, mode }) {
  return (
    <div className="news-item">
      {mode === 'json' ? (
        <pre>{JSON.stringify(item, null, 2)}</pre>
      ) : (
        <div className="tg-post">
          <div className="tg-post-title">{item.title}</div>
          {(item.media?.[0] || item.image) && (
            <img src={item.media?.[0] || item.image} alt="" />
          )}
          <div className="tg-post-text" dangerouslySetInnerHTML={{ __html: item.html || `<p>${item.text}</p>` }} />
          <div className="tg-post-footer">
            <span>{new Date(item.publishedAt).toLocaleString()}</span>
            <a href={item.url} target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      )}
    </div>
  )
}

NewsItem.propTypes = {
  item: PropTypes.object.isRequired,
  mode: PropTypes.oneOf(['json', 'render']).isRequired
}
