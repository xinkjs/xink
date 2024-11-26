//@ts-nocheck
import { expect, expectTypeOf, test } from 'vitest'
import { xink } from '../index.js'
import type { Plugin } from 'vite'
import type { XinkConfig } from '../types.js'


const full_config = await xink({ 
  runtime: 'bun',
  check_origin: true,
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
  await expect(testConfig({ runtime: 'hello' })).rejects.toThrowError('Config runtime "hello" is invalid. Only bun, cloudflare, and deno are supported.')
})

test('Catches invalid check_origin', async () => {
  await expect(testConfig({ runtime: 'bun', check_origin: 'false' })).rejects.toThrowError('check_origin must be a boolean, but "false" is a string.')
})

test('Catches invalid entrypoint', async () => {
  await expect(testConfig({ runtime: 'bun', entrypoint: 'server' })).rejects.toThrowError('entrypoint must be a filename that ends with .js or .ts, but found "server".')
})
