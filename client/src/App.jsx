import { useState, useEffect, useRef } from 'react'
import Logs from './components/Logs.jsx'
import ChannelSelect from './components/ChannelSelect.jsx'
import SourcesTable from './components/SourcesTable.jsx'
import ModeToggle from './components/ModeToggle.jsx'
import Controls from './components/Controls.jsx'
import NewsList from './components/NewsList.jsx'
import TGSources from './components/TGSources.jsx'
import FilterSelect from './components/FilterSelect.jsx'
import FiltersTab from './components/FiltersTab.jsx'

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
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [posting, setPosting] = useState(false)
  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('json')
  const [tab, setTab] = useState('news')
  const [tgUrls, setTgUrls] = useState([])
  const [filters, setFilters] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('none')
  const postingRef = useRef(posting)
  const channelsRef = useRef(selectedChannels)
  const tabRef = useRef(tab)
  const filterRef = useRef(selectedFilter)
  const [, forceTick] = useState(0)
  const toggle = (source) => {
    setSelected(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source])
  }

  const addTgUrl = (url) => {
    fetch('http://localhost:3001/api/tg-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }).then(() => {
      setTgUrls(prev => prev.includes(url) ? prev : [...prev, url])
    }).catch(() => {})
  }

  const removeTgUrl = (url) => {
    fetch(`http://localhost:3001/api/tg-sources?url=${encodeURIComponent(url)}`, {
      method: 'DELETE'
    }).then(() => {
      setTgUrls(prev => prev.filter(u => u !== url))
    }).catch(() => {})
  }

  useEffect(() => {
    postingRef.current = posting
  }, [posting])

  useEffect(() => {
    channelsRef.current = selectedChannels
  }, [selectedChannels])

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    filterRef.current = selectedFilter
  }, [selectedFilter])

  const connect = (endpoint, params) => {
    if (es) return
    const eventSource = new EventSource(`http://localhost:3001${endpoint}?${params}`)
    setEs(eventSource)
    eventSource.onmessage = (e) => {
      const item = JSON.parse(e.data)
      setNews(prev => [item, ...prev])
      setStatuses(prev => ({ ...prev, [item.source]: { ...(prev[item.source] || {}), lastPing: Date.now() } }))
      if (postingRef.current) {
        const base = tabRef.current === 'tg'
          ? `${item.text || item.title}\n${item.url}`
          : `*${item.title}*\n${item.url}`
        const media = item.media?.find(m => m.endsWith('.mp4')) || item.media?.[0]
        const send = (score) => {
          const text = score != null ? `Score for this post is ${score}\n${base}` : base
          channelsRef.current.forEach(ch => {
            fetch('http://localhost:3001/api/post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel: ch, text, media })
            }).catch(() => {})
          })
        }
        const fid = filterRef.current
        if (fid && fid !== 'none') {
          fetch(`http://localhost:3001/api/filters/${fid}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: base })
          })
            .then(r => r.json())
            .then(data => {
              if (data.score > 7) send(data.score)
            })
            .catch(() => {})
        } else {
          send(null)
        }
      }
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

  const startGetting = () => {
    setPosting(false)
    const params = new URLSearchParams()
    params.append('sources', selected.join(','))
    params.append('history', 'true')
    connect('/api/news', params.toString())
  }

  const startScraping = () => {
    setPosting(false)
    const params = new URLSearchParams()
    params.append('urls', tgUrls.join(','))
    params.append('history', 'true')
    connect('/api/tgnews', params.toString())
  }

  const startPosting = () => {
    if (posting) {
      window.alert('Posting is already started')
      return
    }
    if (!window.confirm('Start posting to the selected Telegram channels?')) return
    setPosting(true)
    selectedChannels.forEach(ch => {
      fetch('http://localhost:3001/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: ch, text: 'Posting started' })
      }).catch(() => {})
    })
    if (tab === 'news') {
      const params = new URLSearchParams()
      params.append('sources', selected.join(','))
      params.append('history', 'true')
      connect('/api/news', params.toString())
    } else {
      const params = new URLSearchParams()
      params.append('urls', tgUrls.join(','))
      params.append('history', 'true')
      connect('/api/tgnews', params.toString())
    }
  }

  const stop = () => {
    if (es) {
      es.close()
      setEs(null)
    }
    if (postingRef.current) {
      channelsRef.current.forEach(ch => {
        fetch('http://localhost:3001/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: ch, text: 'Posting ended' })
        }).catch(() => {})
      })
    }
    setPosting(false)
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

  useEffect(() => {
    const esLogs = new EventSource('http://localhost:3001/api/logs')
    esLogs.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setLogs(prev => [data.message, ...prev].slice(0, 50))
    }
    return () => esLogs.close()
  }, [])

  useEffect(() => {
    fetch('http://localhost:3001/api/tg-sources')
      .then(r => r.json())
      .then(data => setTgUrls(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('http://localhost:3001/api/channels')
      .then(r => r.json())
      .then(data => {
        const arr = Object.entries(data).map(([id, info]) => ({ id, ...info }))
        setChannels(arr)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('http://localhost:3001/api/filters')
      .then(r => r.json())
      .then(data => setFilters(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])
  return (
    <div className="App">
      <h3>News Aggregator</h3>
      <div className="tabs">
        <button onClick={() => setTab('news')} className={tab === 'news' ? 'active' : ''}>News Sources</button>
        <button onClick={() => setTab('tg')} className={tab === 'tg' ? 'active' : ''}>TG Scraping</button>
        <button onClick={() => setTab('filters')} className={tab === 'filters' ? 'active' : ''}>Filters</button>
      </div>
      <Logs logs={logs} />
      <ChannelSelect channels={channels} selected={selectedChannels} setSelected={setSelectedChannels} />
      {tab === 'news' ? (
        <SourcesTable sources={sources} selected={selected} toggle={toggle} statuses={statuses} />
      ) : tab === 'tg' ? (
        <>
          <TGSources urls={tgUrls} addUrl={addTgUrl} removeUrl={removeTgUrl} />
          <FilterSelect filters={filters} selected={selectedFilter} setSelected={setSelectedFilter} />
        </>
      ) : (
        <FiltersTab filters={filters} setFilters={setFilters} />
      )}
      {tab !== 'filters' && (
        <>
          <ModeToggle mode={mode} setMode={setMode} />
          <Controls
            startGet={tab === 'news' ? startGetting : startScraping}
            startPost={startPosting}
            stop={stop}
            startLabel={tab === 'news' ? 'Start Getting' : tab === 'tg' ? 'Start Scraping' : 'Start Getting'}
          />
        </>
      )}
      <NewsList news={news} mode={mode} />
    </div>
  )
}

export default App
