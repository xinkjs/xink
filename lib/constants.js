/** @import { DefaultConfig } from './types/internal.js' */

/**
 * @type {DefaultConfig}
 */
export const CONFIG = {
  check_origin: true,
  middleware_dir: 'src/middleware',
  out_dir: 'build',
  params_dir: 'src/params',
  routes_dir: 'src/routes',
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'default', 'HOOKS'
])

export const DISALLOWED_METHODS = new Set([
  'default', 'HOOKS'
])

export const MAX_COOKIE_SIZE = 4129

export const SUPPORTED_RUNTIMES = new Set([ 'bun', 'cloudflare', 'deno' ])

export const ENTRYPOINT_DEFAULTS = new Map([
  ['bun', 'index.ts'],
  ['cloudflare', 'index.ts'],
  ['deno', 'main.ts'],
])
