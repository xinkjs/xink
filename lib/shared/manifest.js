/** @import { Handler, ValidatedConfig } from '../types/internal.js' */
/** @import { BuildConfig, BunPlugin } from 'bun' */
/** @import { ModuleRunner } from 'vite/module-runner' */

import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { ALLOWED_HANDLERS } from '../constants.js'
import { readFiles } from '../utils/main.js'
import { join } from 'node:path'

/**
 * Create manifest file.
 * 
 * @param {ModuleRunner} runner
 * @param {ValidatedConfig} config
 * @param {'development' | 'production'} mode
 */
export const createManifest = async (runner, config, mode) => {
  const cwd = process.cwd()
  console.log('mode, in createManifest is', mode)
  const routes_dir = config.routes
  const params_dir = config.params
  const outdir = config.outdir
  const middleware_dir = config.middleware
  const out_dir = mode === 'development' ? '.xink' : outdir
  const manifest = {
    routes: {},
    params: {},
    middleware: null
  }
  
  try {
    statSync(`${cwd}/${routes_dir}`).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * 
   * @returns {Promise<void>}
   */
  const readParamsDir = async () => {
    try {
      statSync(`${cwd}/${params_dir}`).isDirectory()
    } catch (err) {
      return
    }

    for (const path of readFiles(params_dir)) {
      //console.log('params path', path)
      const src_params_path = `${cwd}/${path}`
      const matcher = (await runner.import(src_params_path)).match ?? null
      //console.log('matcher', matcher)
      if (!matcher || typeof matcher !== 'function')
        continue

      const dev_params_path = `${path}`
      const type = path.split('.')[0].split('/').at(-1)
      const build_params_path = `${outdir}/params/${type}.js`

      manifest.params[type] = mode === 'development' 
        ? dev_params_path
        : build_params_path.slice(outdir.length + 1)

      if (mode !== 'development') {
        // const result = await Bun.build({
        //   entrypoints: [src_params_path],
        //   target
        // })
        /* Build with Vite? */

        // for (const res of result.outputs) {
        //   writeFileSync(build_params_path, res)
        // }
      }
    }
  }

  await readParamsDir()

  const initMiddleware = async () => {
    for (const path of readFiles(middleware_dir, { exact: true, filename: 'middleware' })) {
      const src_middleware_path = `${cwd}/${path}`
      //console.log('middleware path', src_middleware_path)

      const handle = (await runner.import(src_middleware_path)).handle ?? null

      if (!handle)
        throw new Error('Middleware is not exporting a `handle` function.')
      
      if (typeof handle !== 'function')
        throw new Error('Middleware is not a function.')

      const dev_middleware_path = `${path}`
      const build_middleware_path = `${outdir}/middleware.js`

      manifest.middleware = mode === 'development'
        ? dev_middleware_path
        : build_middleware_path.slice(outdir.length + 1)

      if (mode !== 'development') {
        // const transpiler = new Bun.Transpiler({
        //   loader: 'ts'
        // })
        // const code = await Bun.file(src_middleware_path).text()
        // const middleware_js = transpiler.transformSync(code)
        // Bun.write(build_middleware_path, middleware_js)
        // const result = await Bun.build({
        //   entrypoints: [src_middleware_path],
        //   target
        // })
        /* Build with Vite */

        // for (const res of result.outputs) {
        //   writeFileSync(build_middleware_path, res)
        // }
      }
    }
  }

  await initMiddleware()

  /* Read routes directory. */
  for (let p of readFiles(routes_dir, { filename: 'route' })) {
    //console.log('accessing glob file', p)
    const parts = p.substring(routes_dir.length).split('/')
    //console.log('parts', parts)
    const dirs = parts.filter(t => !((/^route\.(?:js|ts)$/).test(t) || t === ''))
    //console.log('path dirs', dirs)
    let path = dirs.length === 0 ? '/' : `/${dirs.join('/')}`
    //console.log('router: init path', path)

    /* Convert matcher segments. */
    path = path.replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, ':$1')

    /* Convert optional segments. */
    path = path.replace(/\[{2}([\w.~-]+?)\]{2}/g, ':$1?')

    /* Convert rest segments. */
    path = path.replace(/\[{1}\.{3}[\w.~-]+?\]{1}/g, '*')

    /* Convert specific and dynamic segments. */
    path = path.replace(/\[{1}/g, ':')
    path = path.replace(/\]{1}/g, '')

    //console.log('router: final path', path)

    const src_endpoint_path = `${cwd}/${p}`
    //console.log('Current glob src endpoint path is', src_endpoint_path)
    const dev_endpoint_path = `${p}`
    //console.log('Current dev endpoint path', dev_endpoint_path)
    const module = await runner.import(`${src_endpoint_path}`)

    /**
     * @type {[string, Handler][]}
     */
    const handlers = Object.entries(module)

    /* Ensure endpoint handlers are valid functions. */
    handlers.forEach(([key, value]) => {
      //console.log('Validating handler', key)
      if (!ALLOWED_HANDLERS.has(key))
        throw new Error(`xink does not support the ${key} endpoint handler, found in ${src_endpoint_path}`)

      if (typeof value !== 'function')
        throw new Error(`Handler ${key} for ${path} is not a function.`)
    })

    const safe_path = path.replace(/:([\w.~-]+)/g, '_$1_')
    //console.log('safe path', safe_path)
    const build_endpoint_path = safe_path === '/' ? `${outdir}/route.js` : `${outdir}/${safe_path.slice(1)}/route.js`
    //console.log('build endpoint path', build_endpoint_path)

    if (mode !== 'development') {
      // const result = await Bun.build({
      //   entrypoints: [src_endpoint_path],
      //   target
      // })
      /* Build with Vite */

      // for (const res of result.outputs) {
      //   writeFileSync(build_endpoint_path, res)
      // }

      manifest.routes[build_endpoint_path.slice(outdir.length + 1)] = {
        path,
        file: build_endpoint_path.slice(outdir.length + 1)
      }
    } else {
      manifest.routes[dev_endpoint_path] = {
        path,
        file: dev_endpoint_path
      }
    }
  }

  //console.log('grabbing manifest')
  const routes_manifest_path = `${cwd}/${out_dir}/manifest.json`
  const routes_manifest_dir = `${cwd}/${out_dir}`
  //console.log('manifest path', routes_manifest_path)
  //console.log('manifest', typeof JSON.stringify(manifest))
  mkdirSync(routes_manifest_dir, { recursive: true })
  writeFileSync(routes_manifest_path, JSON.stringify(manifest))
  console.log('manifest:', manifest)
}
