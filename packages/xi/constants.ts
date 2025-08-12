export const HANDLER_METHODS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'FALLBACK'
])

export const HOOK_METHODS = new Set([
  ...HANDLER_METHODS, 'ALL'
])
