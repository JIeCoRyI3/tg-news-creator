/**
 * Application bootstrap.  This file simply renders the `<App />` component into
 * the root DOM element using React 18's `createRoot` API.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
