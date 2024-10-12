/** @import { ModuleRunner } from 'vite/module-runner' */
import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '../router.js'

/**
 * 
 * @param {ModuleRunner} runner 
 * @param {{ mode: 'dev' }} context 
 * @returns 
 */
export const initRouter = async (runner, context) => {
  const { mode } = context
  const cwd = process.cwd()
  console.log('init router cwd', cwd)
  const router = new Router()
  const manifest = await runner.import(`${mode === 'dev' ? cwd + '/.xink/manifest.json' : cwd + '/manifest.json'}`, { with: { type: 'json'} })
  console.log('build routes', manifest)

  /* Register params. */
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await runner.import(`${cwd}/${v}`)).match ?? null
    console.log('param matcher', k, matcher)
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await runner.import(`${cwd}/${manifest.middleware}`)).handle ?? null
    console.log('middleware handler', handle)
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    if (k === 'default')
      continue
    console.log('processing route', v)
    const module = await runner.import(`${cwd}/${v.file}`)
    console.log('route module', module)
    const handlers = Object.entries(module)
    const store = router.register(v.path)
    console.log('store starts as', store)

    console.log('Processing handlers...')
    handlers.forEach(([verb, handler]) => {
      console.log('Processed handler', verb, ':', typeof verb)
      if (typeof handler !== 'function')
        throw new Error(`Handler ${verb} for route ${v.path} is not a function.`)
      if (!ALLOWED_HANDLERS.has(verb))
        throw new Error(`xink does not support the ${verb} endpoint handler, found in ${v.file}`)

      store[verb] = handler
    })
    console.log('Store is', store)
  }
  console.log('router', router)

  return router
}
