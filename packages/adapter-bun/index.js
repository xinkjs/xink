import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * @typedef {import('@xinkjs/xink').XinkAdaptContext} XinkAdaptContext
 * @typedef {import('./index.d.ts').BunServeOptions} BunServeOptions
 */

/**
 * 
 * @param {BunServeOptions} options
 * @returns {import('@xinkjs/xink').XinkAdapter}
 */
const adapter = (options = {}) => {
  return {
    name: '@xinkjs/adapter-bun',

    /**
     * 
     * @param {XinkAdaptContext} context 
     */
    async adapt(context) {
      context.log('Starting adaptation for Bun...', context)

      const relative_app_path = `./${context.entrypoint.replace(/\\/g, '/').split('.')[0] + '.js'}`
      const server_entry_path = join(context.out_dir, 'server.js')
      const port = options?.port ?? process.env.PORT ?? 3000
      const hostname = options?.hostname ?? process.env.HOST ?? '0.0.0.0'
      const server_entry_content = `import api from '${relative_app_path}';
import { serve as bunServe } from 'bun';

const options = ${JSON.stringify({ ...options, hostname, port })};

console.log(\`Starting server on port \${options.port}...\`);

const server = bunServe({
  ...options,
  fetch: api.fetch,
  error: (err) => { /* ... */ }
});

console.log(\`Server listening on http://\${server.hostname}:\${server.port}\`);
`
      try {
        writeFileSync(server_entry_path, server_entry_content)
        context.log(`Generated server entry point: ${server_entry_path}`)
      } catch (err) {
        console.error(`[Xink Bun Adapter] Failed to write server entry point:`, err)
        throw err
      }
    }
  }
}

export default adapter
