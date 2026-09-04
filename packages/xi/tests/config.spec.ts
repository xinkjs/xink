import { describe, expect, test } from 'vitest'
import { validateConfig } from '../lib/config.js'

describe('configuration', () => {
  test('returns the default configuration', () => {
    expect(validateConfig({})).toStrictEqual({ base_path: '' })
  })

  test('accepts a valid base path', () => {
    expect(validateConfig({ base_path: '/api' })).toStrictEqual({ base_path: '/api' })
  })

  test.each([null, [], 'config'])('rejects invalid config objects', config => {
    expect(() => validateConfig(config as never)).toThrowError('Config must be an object.')
  })

  test.each([null, 0, false])('rejects non-string base paths', base_path => {
    expect(() => validateConfig({ base_path } as never)).toThrowError('base_path must be a string')
  })

  test('requires a non-root absolute base path', () => {
    expect(() => validateConfig({ base_path: 'api' })).toThrowError('base_path must begin with a /')
    expect(() => validateConfig({ base_path: '/' })).toThrowError('base_path cannot be "/"')
  })
})
