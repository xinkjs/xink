import { expect, test } from 'vitest'
import { getRequestOrigin } from '../lib/utils/vite.js'

const request = (host: string | undefined, encrypted = false) => ({
  headers: { host },
  socket: { encrypted }
}) as never

test('constructs an HTTP request origin', () => {
  expect(getRequestOrigin(request('localhost:5173'))).toBe('http://localhost:5173')
})

test('uses the configured HTTPS protocol', () => {
  expect(getRequestOrigin(request('localhost:5173'), true)).toBe('https://localhost:5173')
})

test('prefers the protocol of an encrypted connection', () => {
  expect(getRequestOrigin(request('localhost:5173', true))).toBe('https://localhost:5173')
})

test('rejects a missing host', () => {
  expect(() => getRequestOrigin(request(undefined))).toThrow(
    'Cannot construct request URL without a Host header.'
  )
})
