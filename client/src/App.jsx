import { useState } from 'react'
import './App.css'

const AVAILABLE_SOURCES = {
  bbc: 'BBC',
  cnn: 'CNN',
  reuters: 'Reuters',
  guardian: 'The Guardian',
  aljazeera: 'Al Jazeera'
}

function App() {
  const [selected, setSelected] = useState([])
  const [news, setNews] = useState([])
  const toggle = (source) => {
    setSelected(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }
  const start = async () => {
    const params = new URLSearchParams()
    params.append('sources', selected.join(','))
    const res = await fetch(`http://localhost:3001/api/news?${params}`)
    const data = await res.json()
    setNews(data)
  }
  return (
    <div className="App">
      <h1>News Aggregator</h1>
      <div className="sources">
        {Object.entries(AVAILABLE_SOURCES).map(([id, label]) => (
          <label key={id}>
            <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} /> {label}
          </label>
        ))}
      </div>
      <button onClick={start}>Start</button>
      <div className="news-list">
        {news.map((item, idx) => (
          <div key={idx} className="news-item">
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> <span>({item.source})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
