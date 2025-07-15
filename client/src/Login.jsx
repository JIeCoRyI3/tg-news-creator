import { useState } from 'react'
import PropTypes from 'prop-types'
import Button from './components/ui/Button.jsx'

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
    <form className="login-form" onSubmit={submit}>
      <div className="tg-input">
        <input value={login} onChange={e => setLogin(e.target.value)} placeholder="Login" />
      </div>
      <div className="tg-input">
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      </div>
      <Button type="submit">Login</Button>
    </form>
  )
}

Login.propTypes = {
  onLogin: PropTypes.func
}
