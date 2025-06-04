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
  hromadske: 'Hromadske',
  telegram: 'Telegram Channel'
}

function App() {
  const [selected, setSelected] = useState([])
  const [news, setNews] = useState([])
  const [es, setEs] = useState(null)
  const [statuses, setStatuses] = useState({})
  const [, forceTick] = useState(0)
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
      setStatuses(prev => ({ ...prev, [item.source]: { ...(prev[item.source] || {}), lastPing: Date.now() } }))
    }
    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data)
      setStatuses(prev => ({ ...prev, [data.source]: { ...data, lastPing: Date.now() } }))
    })
    eventSource.addEventListener('ping', (e) => {
      const data = JSON.parse(e.data)
      setStatuses(prev => ({ ...prev, [data.source]: { ...(prev[data.source] || {}), lastPing: Date.now() } }))
    })
    eventSource.onerror = () => {
      eventSource.close()
      setEs(null)
    }
  }

  const stop = () => {
    if (es) {
      es.close()
      setEs(null)
    }
    setStatuses({})
  }
  useEffect(() => {
    return () => {
      if (es) es.close()
    }
  }, [es])

  useEffect(() => {
    const id = setInterval(() => {
      forceTick(t => t + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="App">
      <h3>News Aggregator</h3>
      <table className="sources">
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Ping (s)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(AVAILABLE_SOURCES).map(([id, label]) => (
            <tr key={id} onClick={() => toggle(id)} className={selected.includes(id) ? 'selected' : ''}>
              <td>{label}</td>
              <td className={`status ${statuses[id]?.status}`}>{statuses[id]?.status === 'connected' ? 'Connected' : statuses[id]?.status === 'error' ? 'Error' : ''}</td>
              <td>{statuses[id]?.lastPing ? Math.floor((Date.now() - statuses[id].lastPing)/1000) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="controls">
        <button onClick={start}>Start</button>
        <button onClick={stop}>Stop</button>
      </div>
      <div className="news-list">
        {news.map((item) => (
          <div key={item.url} className="news-item">
            <pre>{JSON.stringify(item, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
