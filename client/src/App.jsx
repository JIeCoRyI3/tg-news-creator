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
  const [statuses, setStatuses] = useState({})
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
    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data)
      setStatuses(prev => ({ ...prev, [data.source]: data }))
    })
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
      <table className="sources">
        <tbody>
          {Object.entries(AVAILABLE_SOURCES).map(([id, label]) => (
            <tr key={id} onClick={() => toggle(id)} className={selected.includes(id) ? 'selected' : ''}>
              <td>{label}</td>
              <td className={`status ${statuses[id]?.status}`}>{statuses[id]?.status === 'connected' ? 'Connected' : statuses[id]?.status === 'error' ? 'Error' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
