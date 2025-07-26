import { useState } from 'react'
import PropTypes from 'prop-types'
import Button from './components/ui/Button.jsx'
import Icon from './components/ui/Icon.jsx'
// Use our locally defined key icon rather than pulling from Font Awesome
import { faKey } from './icons.js'

/**
 * A styled login form with username and password fields.  When the form
 * submits, the credentials are sent to the `/api/login` endpoint.  If
 * successful, the returned token is stored in `localStorage` and the
 * optional `onLogin` callback is invoked to refresh the user state.
 */
export default function Login({ onLogin }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e) => {
    e.preventDefault()
    console.log('Logging in as', login)
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    })
      .then(r => {
        if (!r.ok) throw new Error('fail')
        return r.json()
      })
      .then(data => {
        localStorage.setItem('access-token', data.token)
        console.log('Login success')
        onLogin && onLogin()
      })
      .catch(err => {
        console.log('Login failed', err)
        window.alert('Invalid credentials')
      })
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={submit}>
        <div className="login-title">
          <Icon iconDef={faKey} className="login-icon" />
          <span>Sign in</span>
        </div>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Login"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <Button type="submit">Login</Button>
      </form>
    </div>
  )
}

Login.propTypes = {
  onLogin: PropTypes.func
}
