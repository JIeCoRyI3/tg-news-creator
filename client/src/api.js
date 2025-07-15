export default function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access-token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}
