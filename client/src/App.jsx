import { useState, useEffect } from 'react'
import Logs from './components/Logs.jsx'
import TelegramInput from './components/TelegramInput.jsx'
import SourcesTable from './components/SourcesTable.jsx'
import ModeToggle from './components/ModeToggle.jsx'
import Controls from './components/Controls.jsx'
import NewsList from './components/NewsList.jsx'

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
  rbc: 'RBC Ukraine',
  skynews: 'Sky News',
  foxnews: 'Fox News',
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
    params.append('history', 'true')
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
    setNews([])
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
      <Logs logs={logs} />
      {TG_ENABLED && (
        <TelegramInput channelUrl={channelUrl} setChannelUrl={setChannelUrl} addChannel={addChannel} />
      )}
      <SourcesTable sources={sources} selected={selected} toggle={toggle} statuses={statuses} />
      <ModeToggle mode={mode} setMode={setMode} />
      <Controls start={start} stop={stop} />
      <NewsList news={news} mode={mode} />
    </div>
  )
}

export default App
