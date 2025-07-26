/**
 * Thin wrapper around the native `fetch` API which automatically
 * attaches the bearer token stored in `localStorage` to all requests.
 * The token is stored under the `access-token` key after a successful
 * login.  When no token is present, the request is performed without
 * an Authorization header.
 *
 * @param {string} url The API endpoint to call
 * @param {Object} options Additional fetch options (method, body, headers)
 * @returns {Promise<Response>} The pending fetch promise
 */
export default function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access-token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  console.log('apiFetch', url, options)
  return fetch(url, { ...options, headers })
}
