import { describe, expect, test } from 'vitest'
import { Xi } from '../index.js'
import { BaseStore } from '../types.js'

class Store extends BaseStore {}

class Router extends Xi<Store> {
  protected getStoreConstructor() {
    return Store
  }
}

describe('route matching', () => {
  test('matches static routes exactly', () => {
    const router = new Router()
    const store = router.route('/auth/login')

    expect(router.find('/auth/login')).toStrictEqual({ store, params: {} })
    expect(router.find('/auth/logout')).toStrictEqual({ store: null, params: {} })
  })

  test('captures dynamic parameters', () => {
    const router = new Router()
    const store = router.route('/users/:userId/posts/:postId')

    expect(router.find('/users/42/posts/7')).toStrictEqual({
      store,
      params: { userId: '42', postId: '7' },
    })
  })

  test('matches built-in and custom matchers', () => {
    const router = new Router()
    const numberStore = router.route('/orders/:id=number')
    router.matcher('hex', value => /^[a-f\d]+$/i.test(value))
    const hexStore = router.route('/colors/:value=hex')

    expect(router.find('/orders/123').store).toBe(numberStore)
    expect(router.find('/orders/abc').store).toBeNull()
    expect(router.find('/colors/ff12')).toStrictEqual({
      store: hexStore,
      params: { value: 'ff12' },
    })
  })

  test('matches mixed and mixed-matcher segments', () => {
    const router = new Router()
    const mixedStore = router.route('/releases/v:version')
    const matcherStore = router.route('/api/v:version=number')

    expect(router.find('/releases/vnext')).toStrictEqual({
      store: mixedStore,
      params: { version: 'next' },
    })
    expect(router.find('/api/v2')).toStrictEqual({
      store: matcherStore,
      params: { version: '2' },
    })
    expect(router.find('/api/vtwo').store).toBeNull()
  })

  test('backtracks according to route precedence', () => {
    const router = new Router()
    const dynamicStore = router.route('/users/:id/profile')
    const staticStore = router.route('/users/current/settings')

    expect(router.find('/users/current/settings').store).toBe(staticStore)
    expect(router.find('/users/current/profile')).toStrictEqual({
      store: dynamicStore,
      params: { id: 'current' },
    })
  })

  test('removes captures from failed branches when backtracking', () => {
    const router = new Router()
    router.route('/:candidate=word/nope')
    const store = router.route('/:fallback/ok')

    expect(router.find('/value/ok')).toStrictEqual({
      store,
      params: { fallback: 'value' },
    })
  })

  test('captures wildcard remainders, including an empty remainder', () => {
    const router = new Router()
    const store = router.route('/static/*rest')

    expect(router.find('/static')).toStrictEqual({ store, params: { rest: '' } })
    expect(router.find('/static/js/main.js')).toStrictEqual({
      store,
      params: { rest: '/js/main.js' },
    })
    expect(router.find('//static///js//main.js/')).toStrictEqual({
      store,
      params: { rest: '/js/main.js' },
    })
  })
})

describe('route registration', () => {
  test('allocates child maps only when they are used', () => {
    const router = new Router()
    expect(router.root.static_children_map).toBeNull()
    expect(router.root.matcher_children_map).toBeNull()
    expect(router.root.mixed_children_map).toBeNull()

    router.route('/health')

    expect(router.root.static_children_map).toBeInstanceOf(Map)
    expect(router.root.matcher_children_map).toBeNull()
    expect(router.root.mixed_children_map).toBeNull()
    expect(router.root.static_children.get('health')?.static_children_map).toBeNull()
  })

  test('returns the same store for duplicate routes', () => {
    const router = new Router()
    expect(router.route('/users/:id')).toBe(router.route('/users/:id'))
  })

  test('rejects conflicting dynamic parameter names', () => {
    const router = new Router()
    router.route('/users/:id')

    expect(() => router.route('/users/:userId/posts')).toThrowError(
      'Conflicting parameter names: id and userId',
    )
  })

  test.each([
    ['/:id=number', '/:slug=number'],
    ['/v:id=number', '/v:version=number'],
    ['/v:id', '/v:version'],
  ])('rejects equivalent edges with conflicting names', (first, second) => {
    const router = new Router()
    router.route(first)

    expect(() => router.route(second)).toThrowError('Conflicting parameter names')
  })

  test('keeps dynamic and wildcard parameter names independent', () => {
    const router = new Router()
    const dynamicStore = router.route('/files/:name')
    const wildcardStore = router.route('/files/*path')

    expect(router.find('/files/readme')).toStrictEqual({
      store: dynamicStore,
      params: { name: 'readme' },
    })
    expect(router.find('/files/a/readme')).toStrictEqual({
      store: wildcardStore,
      params: { path: '/a/readme' },
    })
  })

  test.each(['/:', '/*', '/users/:bad-name', '/users/*bad-name'])(
    'rejects invalid parameter labels in %s',
    route => {
      expect(() => new Router().route(route)).toThrowError('Invalid parameter name')
    },
  )

  test('rejects non-terminal wildcards', () => {
    expect(() => new Router().route('/files/*path/more')).toThrowError(
      'Wildcard parameters must be the final route segment',
    )
  })

  test('rejects unknown matchers', () => {
    expect(() => new Router().route('/:id=unknown')).toThrowError('Unknown matcher: unknown')
  })

  test('applies a base path when registering routes', () => {
    const router = new Router({ base_path: '/api' })
    const store = router.route('/users')

    expect(router.find('/api/users').store).toBe(store)
    expect(router.find('/users').store).toBeNull()
  })
})

describe('path validation', () => {
  test('requires paths to begin with a slash', () => {
    const router = new Router()
    expect(() => router.route('users')).toThrowError('Path must start with /')
    expect(() => router.find('users')).toThrowError('Path must start with /')
  })
})
