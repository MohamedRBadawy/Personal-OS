import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('API client configuration', () => {
  test('fails clearly when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    const api = await import('./api')

    await expect(api.getDashboard()).rejects.toThrow(/VITE_API_BASE_URL is not configured/i)
  })

  test('fails clearly when VITE_API_BASE_URL is invalid', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'not-a-url')

    const api = await import('./api')

    await expect(api.getDashboard()).rejects.toThrow(/must be an absolute URL/i)
  })

  test('fails clearly when the backend is unreachable', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/api')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const api = await import('./api')

    await expect(api.getDashboard()).rejects.toThrow(/could not reach the API/i)
  })
})
