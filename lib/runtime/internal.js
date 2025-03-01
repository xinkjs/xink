import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '@xinkjs/xin'
import process from 'node:process'

/**
 * Initialize the router.
 */
export const initRouter = async () => {
  const mode = XINK_VITE_MODE
  const cwd = process.cwd()
  const router = new Router()
  const manifest_file = './manifest.js'
  const { manifest } = mode === 'development' 
    ? await import(/* @vite-ignore */`${cwd}/.xink/manifest.js`) 
    : await import(/* @vite-ignore */manifest_file) // needed so rollup doesn't try to import during build.

  /* Register params. */
  for (const [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode])).match ?? null
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.middleware[mode] : /* @vite-ignore */'./' + manifest.middleware[mode])).handle ?? null
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register error handling. */
  if (manifest.error) {
    const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.error[mode] : /* @vite-ignore */'./' + manifest.error[mode])).handleError ?? null
    if (handle) router.setErrorHandler(handle)
  }

  /* Register routes. */
  for (const [_k, v] of Object.entries(manifest.routes)) {
    const module = await import(`${mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode] }`)
    const handlers = Object.entries(module)
    const store = router.register(v.path)

    handlers.forEach(([method, handler]) => {
      if (typeof handler !== 'function' && method !== 'HOOKS')
        throw new Error(`Handler ${method} for route ${v.path} is not a function.`)

      if (!ALLOWED_HANDLERS.has(method))
        throw new Error(`xink does not support the ${method} endpoint handler, found in ${v.file}`)

      store[method] = handler
    })
  }
  
  return router
}
