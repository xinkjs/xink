import { expect, expectTypeOf, test } from 'vitest'
import { xink } from '../index.js'
import type { Plugin } from 'vite'

const adapter = () => ({
  name: 'test-adapter',
  adapt() {}
})

const full_config = xink({
  adapter,
  entrypoint: 'server.ts',
  out_dir: 'dist'
})

test('returns a Vite plugin with the configured values', () => {
  expectTypeOf(full_config).toMatchTypeOf<Plugin>()
  expect(full_config.name).toBe('vite-plugin-xink')
  expect(full_config.xink_config).toMatchObject({
    adapter,
    entrypoint: 'server.ts',
    out_dir: 'dist'
  })
})

test('uses the default entrypoint and output directory', () => {
  const plugin = xink({ adapter })

  expect(plugin.xink_config).toMatchObject({
    entrypoint: 'index.ts',
    out_dir: 'build'
  })
})

test('catches an invalid entrypoint', () => {
  expect(() => xink({ adapter, entrypoint: 'server' })).toThrowError(
    'entrypoint must be a filename that ends with .js or .ts, but found "server".'
  )
})
