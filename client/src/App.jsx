import { useState, useEffect } from 'react'
import './App.css'

const AVAILABLE_SOURCES = {
  bbc: 'BBC',
  cnn: 'CNN',
  reuters: 'Reuters',
  guardian: 'The Guardian',
  aljazeera: 'Al Jazeera',
  kyivindependent: 'Kyiv Independent',
  kyivpost: 'Kyiv Post',
  unian: 'UNIAN',
  pravda: 'Ukrainska Pravda',
  ukrinform: 'Ukrinform',
  rferl: 'RFE/RL',
  liga: 'Liga',
  rbc: 'RBC Ukraine',
  suspilne: 'Suspilne',
  hromadske: 'Hromadske'
}

function App() {
  const [selected, setSelected] = useState([])
  const [news, setNews] = useState([])
  const [es, setEs] = useState(null)
  const toggle = (source) => {
    setSelected(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }
  const start = () => {
    if (es) es.close()
    const params = new URLSearchParams()
    params.append('sources', selected.join(','))
    const eventSource = new EventSource(`http://localhost:3001/api/news?${params}`)
    setEs(eventSource)
    eventSource.onmessage = (e) => {
      const item = JSON.parse(e.data)
      setNews(prev => [item, ...prev])
    }
    eventSource.onerror = () => {
      eventSource.close()
      setEs(null)
    }
  }
  useEffect(() => {
    return () => {
      if (es) es.close()
    }
  }, [es])
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
            {item.image && <img src={item.image} alt="" />}
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> <span>({item.source})</span>
            {item.text && <p>{item.text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
