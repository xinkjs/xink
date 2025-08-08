export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'FALLBACK', 'HOOKS', 'OPENAPI'
])

export const DISALLOWED_METHODS = new Set([
  'FALLBACK', 'HOOKS', 'OPENAPI'
])

export const SPECIAL_HOOKS = new Set([
  'SCHEMAS', 'VALIDATORS'
])

export const MAX_COOKIE_SIZE = 4129
