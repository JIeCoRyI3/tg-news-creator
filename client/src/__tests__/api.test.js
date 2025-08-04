/** @vitest-environment jsdom */
import { beforeEach, describe, expect, test, vi } from 'vitest'
import apiFetch from '../api'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  test('attaches Authorization header when token present', () => {
    localStorage.setItem('access-token', 'token')
    apiFetch('/test')
    expect(global.fetch).toHaveBeenCalledWith('/test', { headers: { Authorization: 'Bearer token' } })
  })

  test('omits Authorization header without token', () => {
    apiFetch('/test')
    expect(global.fetch).toHaveBeenCalledWith('/test', { headers: {} })
  })
})
