import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * @typedef {import('@xinkjs/xink').XinkAdaptContext} XinkAdaptContext
 * @typedef {import('./index.d.ts').XinkDenoServeOptions} XinkDenoServeOptions
 */

/**
 * Creates the Vite plugin configuration object for the Xink Deno adapter.
 * @param {XinkDenoServeOptions} [options] Adapter configuration.
 * @returns {import('@xinkjs/xink/types').XinkAdapter}
 */
const adapter = (options = {}) => {
  return {
    name: '@xinkjs/adapter-deno',

    /**
     * 
     * @param {XinkAdaptContext} context 
     */
    async adapt(context) {
      context.log('Starting adaptation for Deno...', context)

      const relative_app_path = `./${context.entrypoint.replace(/\\/g, '/').split('.')[0] + '.js'}`
      const server_entry_filename = options.serverEntry ?? 'server.js'
      const server_entry_path = join(context.out_dir, server_entry_filename)

      const port = options?.port ?? parseInt(process.env.PORT || '8000', 10)
      const hostname = options?.hostname ?? process.env.HOST ?? '0.0.0.0'

      const server_entry_content = `import api from '${relative_app_path}';

const port = ${port};
const hostname = "${hostname}";

console.log(\`[Xink Deno Adapter] Starting server on \${hostname}:\${port}...\`);

Deno.serve(
  {
    port,
    hostname,
    onError: (error) => {
      console.error("[Xink Deno Adapter] Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    },
    onListen: ({ port, hostname }) => {
      console.log(\`[Xink Deno Adapter] Server listening on http://\${hostname}:\${port}\`);
    }
  },
  api.fetch
);
`

      try {
        writeFileSync(server_entry_path, server_entry_content)
        context.log(`Generated Deno server entry point: ${server_entry_path}`)
        context.log(`To run: deno run --allow-net --allow-sys --allow-read=${context.out_dir} ${server_entry_path}`)
      } catch (err) {
        console.error(`[Xink Deno Adapter] Failed to write server entry point:`, err)
        throw err // Signal build failure
      }
    },
  }
}

export default adapter
