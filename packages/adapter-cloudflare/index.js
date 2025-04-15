import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * @typedef {import('@xinkjs/xink/types').XinkAdapter} XinkAdapter
 * @typedef {import('@xinkjs/xink/types').XinkAdaptContext} XinkAdaptContext
 * @typedef {import('./index.d.ts').XinkCloudflareAdapterOptions} XinkCloudflareAdapterOptions
 */

/**
 * Creates the Vite plugin configuration object for the Xink Cloudflare adapter.
 * @param {XinkCloudflareAdapterOptions} [options] Adapter configuration.
 * @returns {XinkAdapter}
 */
const adapter = (options = {}) => {
  return {
    name: '@xinkjs/adapter-cloudflare',

    async adapt(context) {
      context.log('Adapting for Cloudflare Workers...')

      const out_dir = context.out_dir
      const api_chunk_filename = context.api_chunk_filename
      const relative_app_path = `./${api_chunk_filename.replace(/\\/g, '/').replace(/\.(mjs|cjs)$/, '.js')}`
      const worker_entry_filename = options.workerEntry ?? '_worker.js'
      const worker_entry_path = join(out_dir, worker_entry_filename)
      const worker_entry_content = `import api from '${relative_app_path}';

export default {
  async fetch(request, env, ctx) {
    try {
      return await api.fetch(request, { env, ctx });
    } catch (e) {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
`

      try {
        writeFileSync(worker_entry_path, worker_entry_content)
        context.log(`Generated entry point: ${worker_entry_path}`)
        context.log(`Done. Configure your wrangler file's "main" to be "${worker_entry_path}"`)
      } catch (err) {
        console.error(`[Xink Cloudflare Adapter] Failed to write worker entry point:`, err)
        throw err
      }
    },
  }
}

export default adapter
