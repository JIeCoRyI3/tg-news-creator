export default function apiFetch(url, options = {}) {
  const token = localStorage.getItem('access-token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  console.log('apiFetch', url, options)
  return fetch(url, { ...options, headers })
}
