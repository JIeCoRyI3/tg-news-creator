import { useState, useEffect, useRef } from 'react'
import Logs from './components/Logs.jsx'
import ChannelSelect from './components/ChannelSelect.jsx'
import ModeToggle from './components/ModeToggle.jsx'
import Controls from './components/Controls.jsx'
import NewsList from './components/NewsList.jsx'
import TGSources from './components/TGSources.jsx'
import FilterSelect from './components/FilterSelect.jsx'
import AuthorSelect from './components/AuthorSelect.jsx'
import FiltersTab from './components/FiltersTab.jsx'
import AuthorsTab from './components/AuthorsTab.jsx'
import AdminTab from './components/AdminTab.jsx'
import Button from './components/ui/Button.jsx'
import apiFetch from './api.js'

import './App.css'


export default function Instance({ id, title, onDelete }) {
  const [news, setNews] = useState([])
  const [es, setEs] = useState(null)
  const [channels, setChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [posting, setPosting] = useState(false)
  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('json')
  const [tab, setTab] = useState('tg')
  const [tgUrls, setTgUrls] = useState([])
  const [filters, setFilters] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [authors, setAuthors] = useState([])
  const [selectedAuthor, setSelectedAuthor] = useState('none')
  const [imageModel, setImageModel] = useState('dall-e-3')
  const [imagePrompt, setImagePrompt] = useState('Create an image for a Telegram post based on the following text: {postText}. The image should have a stylish, minimalistic design with modern, fashionable gradients.')
  const [loaded, setLoaded] = useState(false)
  const postingRef = useRef(posting)
  const channelsRef = useRef(selectedChannels)
  const tabRef = useRef(tab)
  const filterRef = useRef(selectedFilter)
  const filtersRef = useRef(filters)
  const authorRef = useRef(selectedAuthor)
  const authorsRef = useRef(authors)
  const [, forceTick] = useState(0)
  const controlsDisabled = !selectedChannels.length || selectedFilter === 'none' || selectedAuthor === 'none'

  useEffect(() => {
    apiFetch(`/api/instances/${id}`)
      .then(r => r.json())
      .then(data => {
        setSelectedChannels(data.channels || [])
        setMode(data.mode || 'json')
        setTab(data.tab || 'tg')
        setTgUrls(data.tgUrls || [])
        setSelectedFilter(data.filter || 'none')
        setSelectedAuthor(data.author || 'none')
        setImageModel(data.imageModel || 'dall-e-3')
        setImagePrompt(data.imagePrompt || 'Create an image for a Telegram post based on the following text: {postText}. The image should have a stylish, minimalistic design with modern, fashionable gradients.')
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [id])

  useEffect(() => {
    if (!loaded) return
    const body = {
      channels: selectedChannels,
      mode,
      tab,
      tgUrls,
      filter: selectedFilter,
      author: selectedAuthor,
      imageModel,
      imagePrompt
    }
    apiFetch(`/api/instances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {})
  }, [id, loaded, selectedChannels, mode, tab, tgUrls, selectedFilter, selectedAuthor, imageModel, imagePrompt])

  const addTgUrl = (url) => {
    setTgUrls(prev => prev.includes(url) ? prev : [...prev, url])
  }

  const removeTgUrl = (url) => {
    setTgUrls(prev => prev.filter(u => u !== url))
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

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    authorRef.current = selectedAuthor
  }, [selectedAuthor])

  useEffect(() => {
    authorsRef.current = authors
  }, [authors])

  const connect = (endpoint, params) => {
    if (es) return
    const qs = new URLSearchParams(params)
    qs.append('instanceId', id)
    const token = localStorage.getItem('access-token')
    if (token) qs.append('token', token)
    const eventSource = new EventSource(`${endpoint}?${qs.toString()}`)
    setEs(eventSource)
    eventSource.onmessage = (e) => {
      const item = JSON.parse(e.data)
      setNews(prev => [item, ...prev])
      if (postingRef.current) {
        const postId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const base = tabRef.current === 'tg'
          ? `${item.text || item.title}\n${item.url}`
          : `*${item.title}*\n${item.url}`
        const media = item.media?.find(m => m.endsWith('.mp4')) || item.media?.[0]
        const send = (text) => {
          channelsRef.current.forEach(ch => {
            apiFetch('/api/post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel: ch, text, media, instanceId: id, id: postId })
            }).catch(() => {})
          })
        }
        const fid = filterRef.current
        if (fid && fid !== 'none') {
          apiFetch(`/api/filters/${fid}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: base, post_id: postId })
          })
            .then(r => r.json())
            .then(data => {
              const fobj = filtersRef.current.find(f => f.id === fid)
              const threshold = fobj && typeof fobj.min_score === 'number' ? fobj.min_score : 7
              if (data.score > threshold) {
                const aid = authorRef.current
                if (aid && aid !== 'none') {
                  apiFetch(`/api/authors/${aid}/rewrite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: base, post_id: postId })
                  })
                    .then(r => r.json())
                    .then(resp => send(resp.text))
                    .catch(() => {})
                } else {
                  send(base)
                }
              }
            })
            .catch(() => {})
        } else {
          const aid = authorRef.current
          if (aid && aid !== 'none') {
            apiFetch(`/api/authors/${aid}/rewrite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: base, post_id: postId })
            })
              .then(r => r.json())
              .then(resp => send(resp.text))
              .catch(() => {})
          } else {
            send(base)
          }
        }
      }
    }
    eventSource.onerror = () => {
      eventSource.close()
      setEs(null)
    }
  }

  const startScraping = () => {
    if (!selectedChannels.length || selectedFilter === 'none' || selectedAuthor === 'none') {
      window.alert('Please select at least one channel, a filter and an author before starting.')
      return
    }
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
    if (tab === 'tg' && (!selectedChannels.length || selectedFilter === 'none' || selectedAuthor === 'none')) {
      window.alert('Please select at least one channel, a filter and an author before starting.')
      return
    }
    if (!window.confirm('Start posting to the selected Telegram channels?')) return
    setPosting(true)
    selectedChannels.forEach(ch => {
      apiFetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: ch, text: 'Posting started', instanceId: id })
      }).catch(() => {})
    })
    const params = new URLSearchParams()
    params.append('urls', tgUrls.join(','))
    params.append('history', 'true')
    connect('/api/tgnews', params.toString())
  }

  const stop = () => {
    if (es) {
      es.close()
      setEs(null)
    }
    if (postingRef.current) {
      channelsRef.current.forEach(ch => {
        apiFetch('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: ch, text: 'Posting ended', instanceId: id })
        }).catch(() => {})
      })
    }
    setPosting(false)
    setNews([])
    setLogs([])
  }
  useEffect(() => {
    return () => {
      if (es) es.close()
    }
  }, [es])

  useEffect(() => {
    const idInt = setInterval(() => {
      forceTick(t => t + 1)
    }, 1000)
    return () => clearInterval(idInt)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access-token')
    const esLogs = new EventSource(`/api/logs?instanceId=${id}${token ? `&token=${token}` : ''}`)
    esLogs.onmessage = (e) => {
      const data = JSON.parse(e.data)
      console.log(`[${title}] ${data.message}`)
      setLogs(prev => [`[${title}] ${data.message}`, ...prev].slice(0, 50))
    }
    return () => esLogs.close()
  }, [title, id])

  useEffect(() => {
    apiFetch('/api/channels')
      .then(r => r.json())
      .then(data => {
        const arr = Object.entries(data).map(([cid, info]) => ({ id: cid, ...info }))
        setChannels(arr)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/api/filters')
      .then(r => r.json())
      .then(data => setFilters(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/api/authors')
      .then(r => r.json())
      .then(data => setAuthors(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])
  return (
    <div className="App instance">
      <h3>{title}</h3>
      <div className="tabs">
        <Button onClick={() => setTab('tg')} className={tab === 'tg' ? 'active' : ''}>TG Scraping</Button>
        <Button onClick={() => setTab('filters')} className={tab === 'filters' ? 'active' : ''}>Filters</Button>
        <Button onClick={() => setTab('authors')} className={tab === 'authors' ? 'active' : ''}>Author GPT</Button>
        <Button onClick={() => setTab('admin')} className={tab === 'admin' ? 'active' : ''}>Administration</Button>
      </div>
      <Logs logs={logs} />
      <ChannelSelect channels={channels} selected={selectedChannels} setSelected={setSelectedChannels} />
      {tab === 'tg' ? (
        <>
          <TGSources urls={tgUrls} addUrl={addTgUrl} removeUrl={removeTgUrl} />
          <FilterSelect filters={filters} selected={selectedFilter} setSelected={setSelectedFilter} />
          <AuthorSelect authors={authors} selected={selectedAuthor} setSelected={setSelectedAuthor} />
        </>
      ) : tab === 'admin' ? (
        <AdminTab
          instanceId={id}
          onDelete={() => onDelete && onDelete(id)}
          imageModel={imageModel}
          setImageModel={setImageModel}
          imagePrompt={imagePrompt}
          setImagePrompt={setImagePrompt}
        />
      ) : tab === 'filters' ? (
        <FiltersTab filters={filters} setFilters={setFilters} />
      ) : (
        <AuthorsTab authors={authors} setAuthors={setAuthors} />
      )}
      {tab === 'tg' && (
        <>
          <ModeToggle mode={mode} setMode={setMode} />
          <Controls
            startGet={startScraping}
            startPost={startPosting}
            stop={stop}
            startLabel='Start Scraping'
            disabled={controlsDisabled}
          />
        </>
      )}
      {tab !== 'admin' && <NewsList news={news} mode={mode} />}
    </div>
  )
}
