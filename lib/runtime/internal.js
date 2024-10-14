/** @import { ModuleRunner } from 'vite/module-runner' */
import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '@xinkjs/xin'

/**
 * Initialize the router.
 */
export const initRouter = async () => {
  const mode = process.env.XINK_VITE_MODE
  const cwd = process.cwd()
  const router = new Router()
  const manifest = await import(/* @vite-ignore */`${mode === 'development' ? cwd + '/.xink/manifest.json' : cwd + '/manifest.json'}`, { with: { type: 'json'} })

  /* Register params. */
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(/* @vite-ignore */`${cwd}/${v}`)).match ?? null
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(/* @vite-ignore */`${cwd}/${manifest.middleware}`)).handle ?? null
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    if (k === 'default')
      continue

    const module = await import(/* @vite-ignore */`${cwd}/${v.file}`)
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
