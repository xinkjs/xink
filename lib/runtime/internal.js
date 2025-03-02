/** @import { Xink } from '../types/internal.js' */
import { ALLOWED_HANDLERS } from '../constants.js'
import process from 'node:process'

/**
 * Initialize the router.
 * 
 * @param {Xink} _this
 */
export const initRouter = async (_this) => {
  const mode = XINK_VITE_MODE
  const cwd = process.cwd()
  const manifest_file = './manifest.js'
  const { manifest } = mode === 'development' 
    ? await import(/* @vite-ignore */`${cwd}/.xink/manifest.js`) 
    : await import(/* @vite-ignore */manifest_file) // needed so rollup doesn't try to import during build.

  /* Register params. */
  for (const [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode])).match ?? null
    if (matcher) _this.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.middleware[mode] : /* @vite-ignore */'./' + manifest.middleware[mode])).handle ?? null
    if (handle) _this.setMiddleware(handle)
  }

  /* Register error handling. */
  if (manifest.error) {
    const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.error[mode] : /* @vite-ignore */'./' + manifest.error[mode])).handleError ?? null
    if (handle) _this.setErrorHandler(handle)
  }

  /* Register routes. */
  for (const [_k, v] of Object.entries(manifest.routes)) {
    const module = await import(`${mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode] }`)
    const handlers = Object.entries(module)
    const derived_path = _this.getBasePath() ? _this.getBasePath() + (v.path === '/' ? '' : v.path) : v.path
    const store = _this.register(derived_path)

    for (const [method, handler] of handlers) {
      if (method === 'OPENAPI' && typeof handler === 'object') {
        _this.setOpenApiPath(derived_path, handler)
        continue
      }

      if (typeof handler !== 'function' && method !== 'HOOKS')
        throw new Error(`Handler ${method} for route ${v.path} is not a function.`)

      if (!ALLOWED_HANDLERS.has(method))
        throw new Error(`xink does not support the ${method} endpoint handler, found in ${v.file}`)

      store[method] = handler
    }
  }
  
  return _this
}
