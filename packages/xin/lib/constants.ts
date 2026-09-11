export const DISALLOWED_METHODS = new Set([
  'FALLBACK', 'HOOKS', 'OPENAPI'
])

export const CONFIG = {
  allowed_origins: [],
  base_path: '',
  check_origin: true,
  public_origin: undefined
}

export const HANDLER_METHODS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'FALLBACK'
])

export const HOOK_METHODS = new Set([
  ...HANDLER_METHODS, 'ALL'
])
