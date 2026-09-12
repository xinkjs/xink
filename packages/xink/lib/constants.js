/** @import { Config } from './types/internal.js' */

/**
 * @type {Omit<Config, 'adapter'>}
 */
export const CONFIG = {
  entrypoint: 'index.ts',
  middleware_dir: 'src/middleware',
  out_dir: 'build',
  params_dir: 'src/params',
  routes_dir: 'src/routes',
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'default', 'HOOKS', 'OPENAPI'
])

export const STRICT_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'default'
])
