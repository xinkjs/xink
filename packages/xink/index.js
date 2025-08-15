/** @import { XinkConfig, XinkAdapter } from './types.js' */

import { validateConfig } from './lib/utils/config.js'
import { getRequest, setResponse } from './lib/utils/vite.js'
import { createManifestVirtualModule } from './lib/utils/manifest.js'
import { join, relative, resolve as path_resolve } from 'node:path'
import { readFiles } from './lib/utils/main.js'
import { existsSync, readFileSync, statSync } from 'node:fs'
import cleanJson from 'strip-json-comments'

const virtual_manifest_id = 'virtual:xink-manifest'
const resolved_virtual_manifest_id = '\0' + virtual_manifest_id

let vite_config
/** @type {XinkAdapter | undefined} */
let stored_adapter
let api_chunk_filename
let entrypoint
let entrypoint_path

const getTsconfigPaths = (cwd) => {
  let tsconfig_path = join(cwd, 'tsconfig.json')
  let jsconfig_path = join(cwd, 'jsconfig.json')
  let config_file_path = null

  if (existsSync(tsconfig_path))
    config_file_path = tsconfig_path
  else if (existsSync(jsconfig_path)) 
    config_file_path = jsconfig_path

  if (!config_file_path)
    return null

  try {
    const config_content = readFileSync(config_file_path, 'utf-8')
    const config = JSON.parse(cleanJson(config_content))
    
    const compiler_options = config.compilerOptions
    if (!compiler_options || !compiler_options.paths)
      return null

    const base_url = compiler_options.baseUrl ? path_resolve(cwd, compiler_options.baseUrl) : cwd
    const aliases = {}

    for (const alias_key in compiler_options.paths) {
      const paths_array = compiler_options.paths[alias_key]
      if (Array.isArray(paths_array) && paths_array.length > 0) {
        // Vite expects alias keys without trailing '/*' if the path has '/*'
        // and for the replacement path to be relative to root, or absolute.
        const alias_name = alias_key.endsWith('/*') ? alias_key.slice(0, -2) : alias_key
        // The value should be the absolute path to the directory
        const alias_target_path = path_resolve(base_url, paths_array[0].endsWith('/*') ? paths_array[0].slice(0, -2) : paths_array[0])
        
        aliases[alias_name] = alias_target_path
      }
    }
    return aliases

  } catch (error) {
    console.warn(`[Xink Plugin] Could not parse ${config_file_path} for 'paths' aliasing:`, error.message)
    return null
  }
} 

/**
 * @param {XinkConfig} [xink_config]
 * @returns {import('vite').Plugin}
 */
export function xink(xink_config = {}) {
  const cwd = process.cwd()

  const validated_config = validateConfig(xink_config)
  entrypoint = validated_config.entrypoint
  entrypoint_path = join(cwd, entrypoint)
  const routes_dir = validated_config.routes_dir
  const params_dir = validated_config.params_dir
  const middleware_dir = validated_config.middleware_dir
  const error_file_path = join('src', 'error')
  const user_tsconfig_paths = getTsconfigPaths(process.cwd())

  let virtual_manifest_content = ''
  let is_build = false

  return {
    name: 'vite-plugin-xink',
    xink_config: validated_config,
    xink_adapter: validated_config.adapter,

    configResolved(resolved_config) {
      vite_config = resolved_config
      const this_plugin_instance = resolved_config.plugins.find(p => p.name === 'vite-plugin-xink' && p.xink_adapter)
      if (this_plugin_instance)
        stored_adapter = this_plugin_instance.xink_adapter(validated_config.serve_options)
    },

    generateBundle(options, bundle) {
      if (!vite_config.build.ssr) return // Only care about SSR builds

      for (const file_name in bundle) {
        const chunk = bundle[file_name]

        if (chunk.type === 'chunk' && chunk.facadeModuleId === entrypoint_path) {
          api_chunk_filename = chunk.fileName
          break
        }
      }
      if (!api_chunk_filename) {
        console.error(`[Xink Plugin] Could not find output chunk for: ${entrypoint_path}`)
      }
    },

    async closeBundle() {
      if (vite_config.build.ssr && api_chunk_filename && stored_adapter) {
        console.log(`[Xink Plugin] Running adapter: ${stored_adapter.name}`)
        const context = {
          entrypoint,
          out_dir: vite_config.build.outDir,
          api_chunk_filename,
          log: (msg) => console.log(`[${stored_adapter.name}] ${msg}`)
        };
        try {
          await stored_adapter.adapt(context);
        } catch (error) {
          console.error(`[Xink Plugin] Adapter ${stored_adapter.name} failed:`, error)
          throw error
        }
      } else if (vite_config.build.ssr && !stored_adapter) {
          console.warn('[Xink Plugin] SSR build finished, but no adapter was configured.')
      }
    },

    resolveId(id) {
      if (id === virtual_manifest_id)
        return resolved_virtual_manifest_id
    },

    async load(id) {
      if (id === resolved_virtual_manifest_id) {
        if (is_build) {
          try {
            return await createManifestVirtualModule(validated_config)
          } catch (error) {
            console.log('[Xink Plugin] Error generating manifest for build:', error)
            throw error
          }
        } else {
          return virtual_manifest_content
        }
      }

      return null
    },

    async config(config, env) {
      is_build = env.command === 'build'

      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}

      if (user_tsconfig_paths) {
        config.resolve.alias = {
          ...config.resolve.alias,
          ...user_tsconfig_paths
        }
      }

      if (is_build) {
        const input = []

        const routes_glob = readFiles(
          routes_dir,
          { filename: 'route', extensions: ['js', 'ts', 'jsx', 'tsx'] }
        )
        for (const file of routes_glob) input.push(file)

        const params_absolute_dir = join(cwd, params_dir)
        if (existsSync(params_absolute_dir) && statSync(params_absolute_dir).isDirectory()) {
          const params_glob = readFiles(params_dir)
          for (const file of params_glob) input.push(file)
        }

        const middleware_absolute_dir = join(cwd, middleware_dir)
        if (existsSync(middleware_absolute_dir) && statSync(middleware_absolute_dir).isDirectory()) {
          const middleware_glob = readFiles(
            middleware_dir,
            { exact: true, filename: 'middleware' }
          )
          for (const file of middleware_glob) {
            input.push(file)
            break // there should only be one middleware file
          }
        }

        const error_file_absolute_path = join(cwd, 'src', 'error.js')
        const error_file_ts_absolute_path = join(cwd, 'src', 'error.ts')

        if (existsSync(error_file_absolute_path) && statSync(error_file_absolute_path).isFile()) {
          input.push(relative(cwd, error_file_absolute_path))
        } else if (existsSync(error_file_ts_absolute_path) && statSync(error_file_ts_absolute_path).isFile()) {
          input.push(relative(cwd, error_file_ts_absolute_path))
        }

        input.push(entrypoint_path)

        config.build = {
          outDir: validated_config.out_dir,
          ssr: true,
          target: 'esnext',
          minify: false,
          rollupOptions: {
            input,
            output: {
              // --- (Keep output filename logic) ---
              entryFileNames: (chunk) => {
                return `${chunk.facadeModuleId
                  .split(cwd)[1]
                  .slice(1)
                  .split(/\b\./)[0]
                  .replace(/\[{1}(\.{3}[\w.~-]+?)\]{1}/g, '_$1_') // wildcards
                  .replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, '_$1_') // matchers
                  .replace(/=/g, '_') // from matchers
                  .replace(/\[{2}([\w.~-]+?)\]{2}/g, '__$1__') // optionals
                  .replace(/\[{1}/g, '_') // - specifics/dynamics
                  .replace(/\]{1}/g, '_') // - specifics/dynamics
                }.js`
              },
            },
          },
        }
      }

      return {
        define: {
          XINK_CHECK_ORIGIN: validated_config.check_origin,
        },
        environments: {
          ssr: {
            resolve: { noExternal: ['@xinkjs/xink'] }
          }
        }
      }
    },
    async configureServer(server) {
      /* Generate initial manifest content on server start. */
      try {
        virtual_manifest_content = await createManifestVirtualModule(
          validated_config,
        )
      } catch (error) {
        console.error('[Xink] Error generating initial manifest:', error)
        throw error
      }

      server.middlewares.use(async (req, res) => {
        try {
          /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
          const api = await server.ssrLoadModule(entrypoint_path)
          const base = `${
            server.config.server.https ? 'https' : 'http'
          }://${req.headers[':authority'] || req.headers.host}`
          const request = await getRequest(base, req)
          const response = await api.default.fetch(request)
          setResponse(res, response)
        } catch (error) {
          console.error('[Xink] Error processing request:', error)
          res.statusCode = 500
          res.end('Internal Server Error')
          server.ssrFixStacktrace(error)
        }
      })
    },

    async configurePreviewServer(server) {
      server.middlewares.use(async (req, res) => {
        /** @type {{ default: { fetch: (request: Request) => Promise<Response> }}} */
        const api = await import(
          /* @vite-ignore */ join(
            cwd,
            validated_config.out_dir,
            `${entrypoint.split('.')[0]}.js`,
          )
        )
        const base = `${
          server.config.server.https ? 'https' : 'http'
        }://${req.headers[':authority'] || req.headers.host}`
        const request = await getRequest(base, req)
        const response = await api.default.fetch(request)
        setResponse(res, response)
      })
    },

    async hotUpdate(context) {
      const env = this.environment.name

      if (env === 'ssr') {
        const changed_file_relative = relative(cwd, context.file)

        /* Check if the changed file is relevant to the manifest. */
        const is_route_file = changed_file_relative.startsWith(routes_dir) && /route\.[jt]s$/.test(changed_file_relative)
        const is_param_file = changed_file_relative.startsWith(params_dir) && /\.[jt]s$/.test(changed_file_relative)
        const is_middleware_file = changed_file_relative.startsWith(middleware_dir) && /middleware\.[jt]s$/.test(changed_file_relative)
        const is_error_file = changed_file_relative.startsWith(error_file_path) && /\.[jt]s$/.test(changed_file_relative) // Check prefix and extension

        if (is_route_file || is_param_file || is_middleware_file || is_error_file) {
          console.log(`[Xink] Relevant file changed: ${changed_file_relative}. Regenerating manifest...`)
          try {
            /* Regenerate the manifest content. */
            virtual_manifest_content = await createManifestVirtualModule(
              validated_config,
            )

            /* Find the virtual module in the graph. */
            const mod =
              context.server.moduleGraph.getModuleById(
                resolved_virtual_manifest_id,
              )

            if (mod) {
              /* Invalidate the virtual module to trigger reload. */
              context.server.moduleGraph.invalidateModule(mod)
              console.log('[Xink] Virtual manifest module reloaded.')

              /**
               * Return an empty array to signal HMR update is handled.
               * Vite will likely trigger a reload for SSR modules importing this.
               */
              return []
            }
          } catch (error) {
            console.error('[Xink] Error regenerating manifest during HMR:', error)

            /* Prevent Vite's default handling for this file change. */
            return []
          }
        }
      }

      /* If not an ssr environment or relevant file, let Vite handle it normally. */
      return context.modules
    },
  }
}
