/** @import { XinkConfig } from './types.js' */
/** @import { ModuleRunner } from 'vite/module-runner' */
import { CONFIG } from './lib/constants.js'
import { Xink } from './lib/xink.js'
import { validateConfig } from './lib/utils/config.js'
import { getRequest, setResponse } from './lib/utils/vite.js'
import { createManifest } from './lib/shared/manifest.js'
import path from 'path'
import { createDevEnvironment } from './lib/environments/bun.js'
import { createServerHotChannel, createServerModuleRunner } from 'vite'
import * as url from 'node:url'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'url'

/**
 * @param {XinkConfig} [xink_config]
 * @returns {Promise<import('vite').Plugin>}
 */
export async function xink(xink_config) {
  //let config_file_exists = false
  ///** @type {XinkConfig} */
  //let xink_config = {}
  const cwd = process.cwd()
  //const config_path = path.join(cwd, 'xink.config.js')
  //try {
  //  console.log('trying to load xink config')
  //  statSync(config_path).isFile()
  //  config_file_exists = true
  //} catch (error) {}

  // if (config_file_exists) {
  //   console.log('loading config')
  //   xink_config = await import(`${url.pathToFileURL(config_path)}`)
  // }

  const validated_config = validateConfig(xink_config)
  const runtime = validated_config.runtime

  /** @type {ModuleRunner} */
  let runner

  let mode = ''

  return {
    name: 'vite-plugin-xink',
    async config(config, env) {
      mode = env.mode
      config.build = {
        rollupOptions: {
          input: {
            server: path.join(cwd, 'index.ts'),
            routes: path.join(cwd, validated_config.routes, '**/route.ts'),
            params: path.join(cwd, validated_config.params, '**/*.ts'),
            middleware: path.join(cwd, validated_config.middleware, 'middleware.ts')
          }
        }
      }

      return {
        define: {
          'process.env.XINK_VITE_MODE': JSON.stringify(mode)
        }
        // environments: {
        //   bun: {
        //     dev: {
        //       createEnvironment: (server, name) =>
        //         createDevEnvironment(server, name, {
        //           hot: createServerHotChannel()
        //         })
        //     }
        //   }
        // }
      }
    },
    async configureServer(server) {
      runner = createServerModuleRunner(server.environments.ssr)

      await createManifest(runner, validated_config, mode)

      server.middlewares.use(async (req, res) => {
        /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
        const api = await runner.import(path.join(cwd, 'index.ts'))
        const base = `${server.config.server.https ? 'https' : 'http'}://${req.headers[':authority'] || req.headers.host}`
        const request = await getRequest(base, req)
        const response = await api.default.fetch(request)

        setResponse(res, response)
      })
    },
    // async configurePreviewServer(server) {
    //   console.log('########## CONFIGURING PREVIEW SERVER ##########')
    //   runner = createServerModuleRunner(server.environment.ssr)

    //   await createManifest(runner, validated_config, true)

    //   server.middlewares.use(async (req, res) => {
    //     console.log('running vite middlewares')
    //     /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
    //     const api = await runner.import(path.join(cwd, 'index.ts'))
    //     const base = `${server.config.server.https ? 'https' : 'http'}://${req.headers[':authority'] || req.headers.host}`
    //     const request = await getRequest(base, req)
    //     const response = await api.default.fetch(request)

    //     setResponse(res, response)
    //   })
    // },
    async hotUpdate(context) {
      if (context.type === 'create' && context.file.includes('route.ts'))
        await createManifest(runner, validated_config, mode)
    },
    load(id) {
      if (id.includes('vite-plugin-xink-bun'))
        console.log('loaded id is', id)
    }
  }
}
