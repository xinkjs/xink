//@ts-nocheck
import { expect, expectTypeOf, test } from 'vitest'
import { xink } from '../index.js'
import type { Plugin } from 'vite'
import type { XinkConfig } from '../types.js'


const full_config = await xink({ 
  runtime: 'bun',
  csrf: {
    check: true,
    origins: [ 'api.xink.com', 'docs.xink.com' ]
  },
  entrypoint: 'server.ts',
  middleware_dir: 'middleware',
  out_dir: 'dist',
  params_dir: 'params',
  routes_dir: 'routes'
})

const testConfig = async (config: XinkConfig) => {
  return await xink(config)
}

test('Returns Vite Plugin, with all config items set', () => {
  expectTypeOf(full_config).toEqualTypeOf<Plugin<any>>()
})

test('Catches invalid runtime', async () => {
  expect(testConfig({ runtime: 'hello' })).rejects.toThrowError('Config runtime "hello" is invalid. Only bun, deno, and node are supported.')
})

test('Catches invalid csrf check', async () => {
  expect(testConfig({ runtime: 'bun', csrf: { check: 'false' } })).rejects.toThrowError('csrf.check must be a boolean, but "false" is a string.')
})

test('Catches invalid csrf orgins, non-array', async () => {
  expect(testConfig({ runtime: 'bun', csrf: { origins: 'false' } })).rejects.toThrowError('csrf.origins must be an array, but found "false".')
})

test('Catches invalid csrf orgins, non-string array', async () => {
  expect(testConfig({ runtime: 'bun', csrf: { origins: [ 'thing', true ] } })).rejects.toThrowError('csrf.origins must be an array of strings, but found "true" is not.')
})

test('Catches invalid entrypoint', async () => {
  expect(testConfig({ runtime: 'bun', entrypoint: 'server' })).rejects.toThrowError('entrypoint must be a filename that ends with .js or .ts, but found "server".')
})
