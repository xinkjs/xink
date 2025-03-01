/** @import { Handler, ValidatedConfig } from '../types/internal.js' */
/** @import { ModuleRunner } from 'vite/module-runner' */

import { statSync, writeFileSync } from 'node:fs'
import { ALLOWED_HANDLERS } from '../constants.js'
import { readFiles } from '../utils/main.js'
import { join } from 'node:path'

/**
 * Create manifest file.
 * 
 * @param {ModuleRunner} runner
 * @param {ValidatedConfig} config
 */
export const createManifest = async (runner, config) => {
  const cwd = process.cwd()
  const { middleware_dir, params_dir, routes_dir } = config
  const manifest = {
    routes: {},
    params: {},
    middleware: null,
    error: null
  }
  
  try {
    statSync(join(cwd, routes_dir)).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * 
   * @returns {Promise<void>}
   */
  const readParamsDir = async () => {
    try {
      statSync(join(cwd, params_dir)).isDirectory()
    } catch (err) {
      return
    }

    for (const path of readFiles(params_dir)) {
      const src_params_path = join(cwd, path)
      const matcher = (await runner.import(src_params_path)).match ?? null

      if (!matcher || typeof matcher !== 'function')
        continue

      const dev_params_path = `${path}`
      const type = path.split('.')[0].split('/').at(-1)
      const build_params_path = join(params_dir, `${type}.js`)

      manifest.params[type] = {
        development: dev_params_path,
        production: build_params_path
      }
    }
  }

  await readParamsDir()

  const initMiddleware = async () => {
    for (const path of readFiles(middleware_dir, { exact: true, filename: 'middleware' })) {
      const src_middleware_path = join(cwd, path)
      const handle = (await runner.import(src_middleware_path)).handle ?? null

      if (!handle)
        throw new Error('Middleware is not exporting a `handle` function.')
      
      if (typeof handle !== 'function')
        throw new Error('Middleware is not a function.')

      const dev_middleware_path = `${path}`
      const build_middleware_path = join(middleware_dir, `middleware.js`)

      manifest.middleware = {
        development: dev_middleware_path,
        production: build_middleware_path
      }
    }
  }

  await initMiddleware()

  const initErrorHandling = async () => {
    for (const path of readFiles('src', { exact: true, filename: 'error' })) {
      const src_error_path = join(cwd, path)
      const handle = (await runner.import(src_error_path)).handleError ?? null

      if (!handle)
        throw new Error('Error is not exporting a `handleError` function.')

      if (typeof handle !== 'function')
        throw new Error('handleError is not a function.')

      const dev_error_path = `${path}`
      const build_error_path = 'src/error.js'

      manifest.error = {
        development: dev_error_path,
        production: build_error_path
      }
    }
  }

  await initErrorHandling()

  /* Read routes directory. */
  for (let p of readFiles(routes_dir, { filename: 'route' })) {
    const parts = p.substring(routes_dir.length).split('/')
    const dirs = parts.filter(t => !((/^route\.(?:js|ts)$/).test(t) || t === ''))
    let path = dirs.length === 0 ? '/' : `/${dirs.join('/')}`

    /* Convert rest segments for build path. */
    path = path.replace(/\[{1}\.{3}([\w.~-]+?)\]{1}/g, '_...$1_')

    /* Convert matcher segments. */
    path = path.replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, ':$1')

    /* Convert optional segments. */
    path = path.replace(/\[{2}([\w.~-]+?)\]{2}/g, ':$1?')

    

    /* Convert specific and dynamic segments. */
    path = path.replace(/\[{1}/g, ':')
    path = path.replace(/\]{1}/g, '')

    const safe_path = path
      .replace(/=/g, '_') // from matchers
      .replace(/:([\w.~-]+)/g, '_$1_') // dynamic

    const build_endpoint_path = safe_path === '/' ? join(routes_dir, `route.js`) : join(routes_dir, safe_path.slice(1), `route.js`)

    /* Convert rest segments back for router use. */
    path = path.replace(/_{1,2}\.{3}([\w.~-]+?)_{1,2}/g, '*')

    const src_endpoint_path = join(cwd, p)
    const dev_endpoint_path = `${p}`
    const module = await runner.import(`${src_endpoint_path}`)

    /**
     * @type {[string, Handler][]}
     */
    const handlers = Object.entries(module)

    /* Ensure endpoint handlers are valid functions. */
    handlers.forEach(([key, value]) => {
      if (!ALLOWED_HANDLERS.has(key))
        throw new Error(`xink does not support the ${key} endpoint handler, found in ${src_endpoint_path}`)

      if (typeof value !== 'function' && key !== 'HOOKS')
        throw new Error(`Handler ${key} for ${path} is not a function.`)
    })

    manifest.routes[dev_endpoint_path] = {
      path,
      development: dev_endpoint_path,
      production: build_endpoint_path
    }
  }

  const routes_manifest_dir = join(cwd, '.xink')
  const routes_manifest_path = join(routes_manifest_dir, 'manifest.js')

  writeFileSync(routes_manifest_path, `export const manifest = ${JSON.stringify(manifest)}`)
}
