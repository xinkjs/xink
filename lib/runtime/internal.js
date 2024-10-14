/** @import { ModuleRunner } from 'vite/module-runner' */
import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '@xinkjs/xin'

/**
 * Initialize the router.
 * 
 * @returns {Promise<Router>}
 */
export const initRouter = async () => {
  const mode = process.env.XINK_VITE_MODE
  console.log('mode in initRouter is', mode)
  const cwd = process.cwd()
  console.log('init router cwd', cwd)
  const router = new Router()
  const manifest = await import(/* @vite-ignore */`${mode === 'development' ? cwd + '/.xink/manifest.json' : cwd + '/manifest.json'}`, { with: { type: 'json'} })
  //const manifest = await runner.import(`${mode === 'dev' ? cwd + '/.xink/manifest.json' : cwd + '/manifest.json'}`, { with: { type: 'json'} })
  console.log('manifest', manifest)

  /* Register params. */
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(/* @vite-ignore */`${cwd}/${v}`)).match ?? null
    //console.log('param matcher', k, matcher)
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(/* @vite-ignore */`${cwd}/${manifest.middleware}`)).handle ?? null
    //console.log('middleware handler', handle)
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    if (k === 'default')
      continue
    console.log('processing route', v)
    const module = await import(/* @vite-ignore */`${cwd}/${v.file}`)
    //console.log('route module', module)
    const handlers = Object.entries(module)
    const store = router.register(v.path)
    //console.log('store starts as', store)

    //console.log('Processing handlers...')
    handlers.forEach(([method, handler]) => {
      //console.log('Processed handler', method, ':', typeof method)
      if (typeof handler !== 'function')
        throw new Error(`Handler ${method} for route ${v.path} is not a function.`)
      if (!ALLOWED_HANDLERS.has(method))
        throw new Error(`xink does not support the ${method} endpoint handler, found in ${v.file}`)

      store[method] = handler
    })
    console.log('Store is', store)
  }
  //console.log('router', router)
  console.log('done initing router')
  return router
}
