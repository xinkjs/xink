/** @import { XinkConfig } from './types.js' */
import { CONFIG } from './lib/constants.js'
import { Xink } from './lib/xink.js'
import { validateConfig } from './lib/utils/config.js'
import { getRequest, setResponse } from './lib/utils/vite.js'
import { createManifest } from './lib/shared/manifest.js'
import path from 'path'
import { createBunDevEnvironment } from './lib/environments/bun.js'
import { createServer, createServerHotChannel, createServerModuleRunner } from 'vite'
import * as url from 'node:url'
import { statSync } from 'node:fs'

/**
 * @param {XinkConfig} [xink_config]
 * @returns {Promise<import('vite').Plugin>}
 */
export async function xink() {
  console.log('init xink plugin')
  let config_file_exists = false
  /** @type {XinkConfig} */
  let xink_config = {}
  const cwd = process.cwd()
  const config_path = path.join(cwd, 'xink.config.js')
  try {
    console.log('trying to load xink config')
    statSync(config_path).isFile()
    config_file_exists = true
  } catch (error) {}

  // if (config_file_exists) {
  //   console.log('loading config')
  //   xink_config = await import(`${url.pathToFileURL(config_path)}`)
  // }
  console.log('xink config', xink_config)
  const validated_config = validateConfig(xink_config)
  console.log('config', validated_config)

  return {
    name: 'vite-plugin-xink',
    // async config(_config, _env) {
    //   return {
    //     environments: {
    //       bun: {
    //         dev: {
    //           createEnvironment: (server, name) =>
    //             createBunDevEnvironment(server, name)
    //         }
    //       }
    //     }
    //   }
    // },
    async configureServer(server) {
      // const server = await createServer({
      //   server: { middlewareMode: true },
      //   appType: 'custom',
      //   environments: {
      //     bun: {
      //       dev: {
      //         createEnvironment: (name, config) => {
      //           return createBunDevEnvironment(name, config, {
      //             hot: createServerHotChannel()
      //           })
      //         },
      //       },
      //     },
      //   },
      // })
      
      //const dev_env = server.environments['bun']
    
      const runner = createServerModuleRunner(server.environments.ssr)
      await createManifest(runner, validated_config, true)
      const api = new Xink()
      await api.init(runner)
      server.middlewares.use(async (req, res) => {
        console.log('running vite middlewares')
        const base = `${server.config.server.https ? 'https' : 'http'}://${req.headers[':authority'] || req.headers.host}`
        const request = await getRequest(base, req)
        console.log(request)
        const response = await api.fetch(request)
        console.log('response', response)

        setResponse(res, response)
      })

      // vite.watcher.on('change', async (file) => {
      //   if (file.includes(xink_config.routes) || file.includes(xink_config.params || file.includes(xink_config.middleware))) {
      //     vite.restart()
      //   }
      // })
    },
  }
}
