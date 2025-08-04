import { describe, it, expect, beforeEach, vi } from 'vitest'
import apiFetch from '../api'

const mockFetch = vi.fn(() => Promise.resolve({ ok: true }))

beforeEach(() => {
  vi.restoreAllMocks()
  global.fetch = mockFetch
  mockFetch.mockClear()
  localStorage.clear()
})

describe('apiFetch', () => {
  it('attaches Authorization header when token exists', () => {
    localStorage.setItem('access-token', 'abc123')
    apiFetch('/test')
    expect(mockFetch).toHaveBeenCalledWith('/test', {
      headers: { Authorization: 'Bearer abc123' }
    })
  })

  it('preserves existing headers and omits Authorization without token', () => {
    apiFetch('/test', { method: 'POST', headers: { 'X-Test': '1' } })
    expect(mockFetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      headers: { 'X-Test': '1' }
    })
  })
})
