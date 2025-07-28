/**
 * Container component that renders a list of NewsItem components.  The parent
 * supplies the array of posts and the preferred rendering mode.
 */
import PropTypes from 'prop-types'
import NewsItem from '../NewsItem'

/**
 * Render the list of posts.
 */
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
