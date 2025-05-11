/** @import { Config } from './types/internal.js' */

/**
 * @type {Config}
 */
export const CONFIG = {
  adapter: null,
  check_origin: true,
  entrypoint: 'index.ts',
  middleware_dir: 'src/middleware',
  out_dir: 'build',
  params_dir: 'src/params',
  routes_dir: 'src/routes',
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'default', 'HOOKS', 'OPENAPI'
])

export const DISALLOWED_METHODS = new Set([
  'default', 'HOOKS', 'OPENAPI'
])

export const SPECIAL_HOOKS = new Set([
  'SCHEMAS', 'VALIDATORS'
])

export const MAX_COOKIE_SIZE = 4129
