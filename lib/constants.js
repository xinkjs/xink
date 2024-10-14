/** @import { DefaultConfig } from './types/internal.js' */

/**
 * @type {DefaultConfig}
 */
export const CONFIG = {
  middleware: 'src',
  params: 'src/params',
  outdir: 'out',
  routes: 'src/routes'
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'
])

export const MAX_COOKIE_SIZE = 4129

export const SUPPORTED_RUNTIMES = new Set([ 'node', 'bun', 'deno'])
