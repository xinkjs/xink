import { expect, expectTypeOf, test } from 'vitest'
import { Xin } from '../index.js'
import type { ParsePath } from '../types.js'

test('infers mixed-matcher parameter names', () => {
  expectTypeOf<ParsePath<'/api/v:version=number'>>().toEqualTypeOf<{ version: string }>()
})

test('lists every route child type', () => {
  const router = new Xin()
  router.route('/static')
  router.route('/:dynamic')
  router.route('/:matched=number')
  router.route('/v:mixed')
  router.route('/files/*rest')

  expect(router.getRoutes().map(route => route.pattern).sort()).toEqual([
    '/:dynamic',
    '/:matched=number',
    '/files/*rest',
    '/static',
    '/v:mixed',
  ])
})

test('merges every route child type', () => {
  const source = new Xin()
  source.route('/static').get(() => new Response())
  source.route('/:dynamic').get(() => new Response())
  source.route('/:matched=number/details').get(() => new Response())
  source.route('/v:mixed/details').get(() => new Response())
  source.route('/files/*rest').get(() => new Response())

  const target = new Xin()
  target.router(source)

  expect(target.find('/static').store).not.toBeNull()
  expect(target.find('/value').params).toStrictEqual({ dynamic: 'value' })
  expect(target.find('/12/details').params).toStrictEqual({ matched: '12' })
  expect(target.find('/vnext/details').params).toStrictEqual({ mixed: 'next' })
  expect(target.find('/files/a/b').params).toStrictEqual({ rest: '/a/b' })
  expect(target.getRoutes().every(route => route.pattern !== '')).toBe(true)
})

test('merges routers under multi-segment base paths', () => {
  const source = new Xin()
  source.route('/users').get(() => new Response())
  const target = new Xin({ base_path: '/api/v1' })

  target.router(source)

  expect(target.find('/api/v1/users').store).not.toBeNull()
  expect(target.getRoutes().map(route => route.pattern)).toContain('/api/v1/users')
})

test('merges custom matcher registries', () => {
  const source = new Xin()
  source.matcher('hex', value => /^[a-f\d]+$/i.test(value))
  source.route('/colors/:value=hex').get(() => new Response())
  const target = new Xin()

  target.router(source)

  expect(target.find('/colors/ff12').params).toStrictEqual({ value: 'ff12' })
})

test('rejects conflicting matcher implementations while merging', () => {
  const source = new Xin()
  source.matcher('custom', () => true)
  const target = new Xin()
  target.matcher('custom', () => false)

  expect(() => target.router(source)).toThrowError('Conflicting matcher: custom')
})

test('rejects parameter conflicts while merging routers', () => {
  const target = new Xin()
  target.route('/users/:id')
  const source = new Xin()
  source.route('/users/:userId')

  expect(() => target.router(source)).toThrowError('Conflicting parameter names: id and userId')
})
