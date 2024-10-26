import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '@xinkjs/xin'

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
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode])).match ?? null
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.middleware[mode] : /* @vite-ignore */'./' + manifest.middleware[mode] )).handle ?? null
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    const module = await import(`${mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode] }`)
    const handlers = Object.entries(module)
    const store = router.register(v.path)

    handlers.forEach(([method, handler]) => {
      if (typeof handler !== 'function')
        throw new Error(`Handler ${method} for route ${v.path} is not a function.`)
      if (!ALLOWED_HANDLERS.has(method))
        throw new Error(`xink does not support the ${method} endpoint handler, found in ${v.file}`)

      store[method] = handler
    })
  }
  
  return router
}
