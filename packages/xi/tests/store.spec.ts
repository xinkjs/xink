import { expect, test, vi } from 'vitest'
import { Router } from '../index.js'
import type { Handler, Store } from '../index.js'

const api = new Router()
let store: Store | undefined

test('Register allowed methods', async () => {
  store = api.route('/')
    .get(() => new Response('Hello GET'))
    .post(() => new Response('Hello POST'))
    .put(() => new Response('Hello PUT'))
    .patch(() => new Response('Hello PATCH'))
    .delete(() => new Response('Hello DELETE'))
    .head(() => new Response('Hello HEAD'))
    .options(() => new Response('Hello OPTIONS'))
    .fallback(() => new Response('Hello FALLBACK'))
})

test('getHandler', () => {
  expect(store?.getHandler('GET')).toBeTypeOf('function')
})

test('getMethods', () => {
  expect(store?.getMethods())
    .toStrictEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'FALLBACK'])
})

test('hasMethod', () => {
  expect(store?.hasMethod('POST')).toBe(true)
})

test('!hasMethod', () => {
  expect(store?.hasMethod('FAKE')).toBe(false)
})

function setHandler(method: string, handler: Handler) {
  store?.setHandler(method, handler)
  return true
}

test('setHandler', () => {
  const setHandlerSpy = vi.fn(setHandler)

  const success = setHandlerSpy('POST', () => new Response('Hello POST'))
  expect(success).toBe(true)
  expect(setHandlerSpy).toHaveReturned() // need "spy" function for this to work
})

test('Reject invalid methods', () => {
  const setHandlerSpy = vi.fn(setHandler)

  expect(() => setHandlerSpy('post', () => new Response()))
    .toThrowError('Method post is invalid; it should be UPPERCASE.')
})

test('Reject non-allowed methods', () => {
  const setHandlerSpy = vi.fn(setHandler)

  expect(() => setHandlerSpy('FAKE', () => new Response()))
    .toThrowError('Method FAKE not allowed.')
})

test('Find a route', () => {
  const info = api.find('/')
  expect(!!info.store).toBe(true)
})

test('Set and get a method hook', () => {
  const store = api.route('/user/:id')
    .get(
      () => new Response('Hello GET, from /user/:id'), // handler
      () => console.log('hook 1') // hook
    )

  const hooks = store.getHooks('GET')
  expect(hooks && hooks.length > 0)
})
