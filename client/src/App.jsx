import { useState, useEffect } from 'react'
import apiFetch from './api.js'
import Instance from './Instance.jsx'
import Users from './Users.jsx'
import Button from './components/ui/Button.jsx'
import Icon from './components/ui/Icon.jsx'
// Import our locally defined icons instead of Font Awesome packages
import {
  faHome,
  faUsers,
  faRightFromBracket,
  faPlus,
  faTrash
} from './icons.js'
import Login from './Login.jsx'
import './App.css'
import './ModernDashboard.css'

/**
 * Root component of the application.  This component manages authentication,
 * navigation and rendering of pages.  It has been redesigned to follow a
 * modern dashboard layout with a persistent sidebar and a content area.
 */
export default function App() {
  // Title of a new instance to be created
  const [title, setTitle] = useState('')
  // Array of existing instances returned from the API
  const [instances, setInstances] = useState([])
  // Current authenticated user object; null if not logged in
  const [user, setUser] = useState(null)
  // Which page to display: 'dashboard' or 'users'
  const [page, setPage] = useState('dashboard')

  /**
   * Fetch current user from the API.  If the request fails, the user is set
   * to null.  Successful authentication stores the user object in state.
   */
  const loadUser = () => {
    apiFetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }

  // On mount, attempt to restore a session from localStorage.
  useEffect(() => {
    if (localStorage.getItem('access-token')) {
      loadUser()
    }
  }, [])

  // Whenever the user changes, (re-)load the list of instances.
  useEffect(() => {
    if (!user) return
    apiFetch('/api/instances')
      .then(r => r.json())
      .then(data => setInstances(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user])

  /**
   * Create a new instance on the backend and update local state.  Blank titles
   * are ignored.  After creation, the input field is cleared.
   */
  const addInstance = () => {
    const t = title.trim()
    if (!t) return
    apiFetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t })
    })
      .then(r => r.json())
      .then(inst => setInstances(prev => [...prev, inst]))
      .catch(() => {})
    setTitle('')
  }

  /**
   * Remove an instance from local state.  When the instance is deleted on
   * the server, it will no longer be returned from subsequent API calls.
   */
  const removeInstance = (id) => {
    setInstances(prev => prev.filter(i => i.id !== id))
  }

  /**
   * Logout the current user and clear the session token.  After logging
   * out the user state is set to null which triggers the login page.
   */
  const logout = () => {
    apiFetch('/api/logout').finally(() => {
      localStorage.removeItem('access-token')
      setUser(null)
    })
  }

  // Render the login page if there is no authenticated user
  if (!user) {
    return (
      <div className="login-page">
        <Login onLogin={loadUser} />
      </div>
    )
  }

  // Render the dashboard or users page inside the content area
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">TG&nbsp;News&nbsp;Creator</div>
        <nav className="sidebar-nav">
          <button
            onClick={() => setPage('dashboard')}
            className={page === 'dashboard' ? 'active' : ''}
          >
            <Icon iconDef={faHome} className="nav-icon" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setPage('users')}
            className={page === 'users' ? 'active' : ''}
          >
            <Icon iconDef={faUsers} className="nav-icon" />
            <span>Users</span>
          </button>
          <button onClick={logout}>
            <Icon iconDef={faRightFromBracket} className="nav-icon" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
      <main className="content-area">
        {page === 'dashboard' ? (
          <div className="dashboard-page">
            <div className="dashboard-header">
              <h1>Dashboard</h1>
              <div className="dashboard-add-instance">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Instance title"
                />
                <Button onClick={addInstance}>
                  <Icon iconDef={faPlus} className="btn-icon" />
                  <span>Add Instance</span>
                </Button>
              </div>
            </div>
            <div className="instances-grid">
              {instances.map(inst => (
                <div key={inst.id} className="instance-card">
                  <div className="instance-card-header">
                    <h2>{inst.title}</h2>
                  </div>
                  {/*
                    The Instance component encapsulates all of the controls for a
                    particular instance.  It receives id and title props and
                    triggers the onDelete callback when the internal delete
                    button is used.  Styling for the inner content can be
                    enhanced via the ModernDashboard.css rules.
                  */}
                  <Instance
                    id={inst.id}
                    title={inst.title}
                    onDelete={() => removeInstance(inst.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Users />
        )}
      </main>
    </div>
  )
}