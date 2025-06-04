import { useState, useEffect } from 'react'

const TG_ENABLED = import.meta.env.VITE_TG_INTEGRATION_FF === 'true'
import './App.css'

const INITIAL_SOURCES = {
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
  const [sources, setSources] = useState(INITIAL_SOURCES)
  const [channelUrl, setChannelUrl] = useState('')
  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('json')
  const [, forceTick] = useState(0)
  const toggle = (source) => {
    setSelected(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }

  const addChannel = async () => {
    if (!TG_ENABLED) return
    const url = channelUrl.trim()
    if (!url) return
    try {
      const resp = await fetch(`http://localhost:3001/api/telegram-info?url=${encodeURIComponent(url)}`)
      const data = await resp.json()
      if (data.username) {
        const id = `tg:${data.username.replace(/^@/, '')}`
        setSources(prev => ({ ...prev, [id]: data.title }))
        setChannelUrl('')
      }
    } catch {
      /* ignore */
    }
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
    eventSource.addEventListener('log', (e) => {
      const data = JSON.parse(e.data)
      setLogs(prev => [data.message, ...prev].slice(0, 50))
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
    setLogs([])
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
      <div className="logs">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {TG_ENABLED && (
        <div className="tg-input">
          <input value={channelUrl} onChange={e => setChannelUrl(e.target.value)} placeholder="Telegram channel link" />
          <button onClick={addChannel}>Add</button>
        </div>
      )}
      <table className="sources">
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Ping (s)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(sources).map(([id, label]) => (
            <tr key={id} onClick={() => toggle(id)} className={selected.includes(id) ? 'selected' : ''}>
              <td>{label}</td>
              <td className={`status ${statuses[id]?.status}`}>{statuses[id]?.status === 'connected' ? 'Connected' : statuses[id]?.status === 'error' ? 'Error' : ''}</td>
              <td>{statuses[id]?.lastPing ? Math.floor((Date.now() - statuses[id].lastPing)/1000) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mode-toggle">
        <label><input type="radio" checked={mode === 'json'} onChange={() => setMode('json')} /> JSON</label>
        <label><input type="radio" checked={mode === 'render'} onChange={() => setMode('render')} /> Render</label>
      </div>
      <div className="controls">
        <button onClick={start}>Start</button>
        <button onClick={stop}>Stop</button>
      </div>
        <div className="news-list">
          {news.map((item) => (
            <div key={item.url} className="news-item">
              {mode === 'json' ? (
                <pre>{JSON.stringify(item, null, 2)}</pre>
              ) : (
                <>
                  <h4>{item.title}</h4>
                  {item.image && <img src={item.image} alt="" />}
                  <p>{item.text}</p>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                </>
              )}
            </div>
          ))}
        </div>
    </div>
  )
}

export default App
