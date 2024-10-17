/** @import { DefaultConfig } from './types/internal.js' */

/**
 * @type {DefaultConfig}
 */
export const CONFIG = {
  entrypoint: 'index.ts',
  middleware_dir: 'src',
  out_dir: 'out',
  params_dir: 'src/params',
  routes_dir: 'src/routes',
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'
])

export const MAX_COOKIE_SIZE = 4129

export const SUPPORTED_RUNTIMES = new Set([ 'node', 'bun', 'deno'])
