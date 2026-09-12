import { afterEach, expect, test, vi } from 'vitest'
import { Xin } from '../index.js'
import type { XinConfig } from '../types.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const formRequest = (origin: string) => new Request('http://127.0.0.1/submit', {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    origin
  },
  body: 'value=test'
})

test('accepts an empty public configuration', () => {
  const config: XinConfig = {}

  expect(new Xin(config)).toBeInstanceOf(Xin)
})

test('rejects invalid configuration values', () => {
  expect(() => new Xin(null as never)).toThrow('Config must be an object.')
})

test('allows the effective request origin by default', async () => {
  const api = new Xin()
  api.route('/submit').post(() => new Response('ok'))

  const response = await api.fetch(formRequest('http://127.0.0.1'))

  expect(response.status).toBe(200)
})

test('allows configured origins in addition to the request origin', async () => {
  const api = new Xin({ allowed_origins: ['https://admin.example.com/'] })
  api.route('/submit').post(() => new Response('ok'))

  const response = await api.fetch(formRequest('https://admin.example.com'))

  expect(response.status).toBe(200)
})

test('a non-empty origin list overrides a disabled deprecated check', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const api = new Xin({ allowed_origins: ['https://admin.example.com'], check_origin: false })
  api.route('/submit').post(() => new Response('ok'))

  const response = await api.fetch(formRequest('https://untrusted.example.com'))

  expect(response.status).toBe(403)
})

test('retains disabled origin checks for backwards compatibility', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const api = new Xin({ check_origin: false })
  api.route('/submit').post(() => new Response('ok'))

  const response = await api.fetch(formRequest('https://untrusted.example.com'))

  expect(response.status).toBe(200)
  expect(warning).toHaveBeenCalledWith(
    '[Xin] `check_origin` is deprecated. Use `allowed_origins` instead.'
  )
})

test('uses the public origin consistently in request events', async () => {
  const api = new Xin({ public_origin: 'https://api.example.com/' })
  api.route('/submit').get(event => Response.json({
    request_url: event.request.url,
    url: event.url.href
  }))

  const response = await api.fetch(new Request('http://127.0.0.1/submit?value=test'))

  expect(await response.json()).toEqual({
    request_url: 'https://api.example.com/submit?value=test',
    url: 'https://api.example.com/submit?value=test'
  })
})

test('uses the public origin for form checks without losing the request body', async () => {
  const api = new Xin({ public_origin: 'https://api.example.com' })
  api.route('/submit').post(async event => new Response(await event.request.text()))
  const request = formRequest('https://api.example.com')

  const response = await api.fetch(request)

  expect(response.status).toBe(200)
  expect(await response.text()).toBe('value=test')
})

test('rejects invalid configured origins', () => {
  expect(() => new Xin({ allowed_origins: ['https://example.com/path'] })).toThrow(
    'allowed_origins contains an invalid origin: "https://example.com/path".'
  )
  expect(() => new Xin({ public_origin: 'ftp://example.com' })).toThrow(
    'public_origin contains an invalid origin: "ftp://example.com".'
  )
})
