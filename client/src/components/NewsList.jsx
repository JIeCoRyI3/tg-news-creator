import PropTypes from 'prop-types'
import NewsItem from './NewsItem.jsx'

export default function NewsList({ news, mode }) {
  return (
    <div className="news-list">
      {news.map(item => (
        <NewsItem key={`${item.url}-${item.publishedAt}`} item={item} mode={mode} />
      ))}
    </div>
  )
}

NewsList.propTypes = {
  news: PropTypes.arrayOf(PropTypes.object).isRequired,
  mode: PropTypes.oneOf(['json', 'render']).isRequired
}
