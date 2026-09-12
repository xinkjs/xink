import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * @typedef {import('@xinkjs/xink').XinkAdaptContext} XinkAdaptContext
 * @typedef {import('./index.d.ts').DenoServeOptions} DenoServeOptions
 */

/**
 * Creates the Vite plugin configuration object for the Xink Deno adapter.
 * @param {DenoServeOptions} [options] Adapter configuration.
 * @returns {import('@xinkjs/xink').XinkAdapter}
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
      const server_entry_path = join(context.out_dir, 'server.js')
      const { tls, signal, onError, onListen, ...serve_options } = options
      const server_entry_content = `import api from '${relative_app_path}';

const options = ${JSON.stringify(serve_options)};
const tlsConfig = ${JSON.stringify(tls)};
const certFile = tlsConfig?.cert_file ?? Deno.env.get('TLS_CERT_FILE');
const keyFile = tlsConfig?.key_file ?? Deno.env.get('TLS_KEY_FILE');

if (Boolean(certFile) !== Boolean(keyFile))
  throw new Error('TLS_CERT_FILE and TLS_KEY_FILE must be configured together.');

const tls = certFile && keyFile
  ? {
      cert: await Deno.readTextFile(certFile),
      key: await Deno.readTextFile(keyFile)
    }
  : undefined;
const envPort = Deno.env.get('PORT');
const port = options.port ?? (envPort ? Number.parseInt(envPort, 10) : 8000);
const hostname = options.hostname ?? Deno.env.get('HOST') ?? '0.0.0.0';

console.log(\`Starting server on \${hostname}:\${port}...\`);

Deno.serve(
  {
    ...options,
    port,
    hostname,
    ...(tls && tls),
    onError: (error) => {
      console.error("Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    },
    onListen: ({ port, hostname }) => {
      console.log(\`Server listening on \${tls ? 'https' : 'http'}://\${hostname}:\${port}\`);
    }
  },
  api.fetch
);
`

      try {
        writeFileSync(server_entry_path, server_entry_content)
        context.log(`Generated Deno server entry point: ${server_entry_path}`)
        context.log(`To run: deno run --allow-env --allow-net --allow-read ${server_entry_path}`)
      } catch (err) {
        console.error(`[Xink Deno Adapter] Failed to write server entry point:`, err)
        throw err // Signal build failure
      }
    },
  }
}

export default adapter
