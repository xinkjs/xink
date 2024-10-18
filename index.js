/** @import { XinkConfig } from './types.js' */
/** @import { ModuleRunner } from 'vite/module-runner' */

import { validateConfig } from './lib/utils/config.js'
import { getRequest, setResponse } from './lib/utils/vite.js'
import { createManifest } from './lib/utils/manifest.js'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { Glob } from 'glob'

/**
 * @param {XinkConfig} [xink_config]
 * @returns {Promise<import('vite').Plugin>}
 */
export async function xink(xink_config) {
  //let config_file_exists = false
  ///** @type {XinkConfig} */
  //let xink_config = {}
  const cwd = process.cwd()
  const route_file_regex = /route.[j,t]s/
  //const config_path = join(cwd, 'xink.config.js')
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
  const entrypoint = validated_config.entrypoint

  /** @type {ModuleRunner} */
  let runner

  return {
    name: 'vite-plugin-xink',
    async config(config, env) {
      const mode = env.mode

      if (mode == 'production') {
        const routes_glob = new Glob(join(cwd, validated_config.routes_dir, '**/route.{js,ts}'), {})
        const params_glob = new Glob(join(cwd, validated_config.params_dir, '**/*.{js,ts}'), {})
        const middleware_glob = new Glob(join(cwd, validated_config.middleware_dir, '**', 'middleware.{js,ts}'), {})
        const entrypoint_glob = new Glob(join(cwd, 'index.{js,ts}'), {})
        const input = []

        for (const file of routes_glob)
          input.push(file)

        for (const file of params_glob)
          input.push(file)

        for (const file of middleware_glob) {
          input.push(file)
          break // there should only be one middleware file
        }

        for (const file of entrypoint_glob) {
          input.push(file)
          break // there should only be one entrypoint file
        }

        config.build = {
          outDir: validated_config.out_dir,
          ssr: true,
          target: 'esnext',
          rollupOptions: {
            input,
            output: {
              entryFileNames: (chunk) => {
                /**
                 * 2nd `split` only at word boundary (\b);
                 * otherwise, we'd split the rest segments too,
                 * instead of just the filename extension.
                 */
                return `${
                  chunk.facadeModuleId.split(cwd)[1].slice(1).split(/\b\./)[0]
                    .replace(/\[{1}(\.{3}[\w.~-]+?)\]{1}/g, '_$1_') // wildcards
                    .replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, '_$1_') // matchers
                    .replace(/=/g, '_') // from matchers
                    .replace(/\[{2}([\w.~-]+?)\]{2}/g, '__$1__') // optionals
                    .replace(/\[{1}/g, '_') // - specifics/dynamics
                    .replace(/\]{1}/g, '_')  // - specifics/dynamics
                }.js`
              }
            }
          }
        }
      }

      return {
        define: {
          'process.env.XINK_VITE_MODE': JSON.stringify(mode),
          'process.env.XINK_OUT_DIR': JSON.stringify(validated_config.out_dir)
        },
        // environments: {
        //   bun: {
        //     dev: {
        //       createEnvironment: (name, config) =>
        //         createBunDevEnvironment(name, config, {
        //           hot: createServerHotChannel()
        //         })
        //     }
        //   }
        // }
      }
    },
    async writeBundle() {
      /* Copy routes manifest to out directory. */
      copyFileSync(join(cwd, '.xink/manifest.json'), join(cwd, validated_config.out_dir, 'manifest.json'))
    },
    async configureServer(server) {
      runner = server.environments.ssr.runner

      await createManifest(runner, validated_config)

      server.middlewares.use(async (req, res) => {
        /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
        const api = await runner.import(join(cwd, entrypoint))
        const base = `${server.config.server.https ? 'https' : 'http'}://${req.headers[':authority'] || req.headers.host}`
        const request = await getRequest(base, req)
        const response = await api.default.fetch(request)

        setResponse(res, response)
      })
    },
    async configurePreviewServer(server) {
      server.middlewares.use(async (req, res) => {
        /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
        const api = await import(/* @vite-ignore */join(cwd, validated_config.out_dir, `${entrypoint.split('.')[0]}.js`))
        const base = `${server.config.server.https ? 'https' : 'http'}://${req.headers[':authority'] || req.headers.host}`
        const request = await getRequest(base, req)
        const response = await api.default.fetch(request)

        setResponse(res, response)
      })
    },
    async hotUpdate(context) {
      if (context.type === 'create' && route_file_regex.test(context.file))
        /**
          * TODO - only update the manifest, instead of recreating the whole thing.
          */
        await createManifest(runner, validated_config)
    }
  }
}
