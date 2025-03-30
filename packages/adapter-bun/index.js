// packages/adapter-bun/index.js
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * 
 * @param {*} options
 * @returns {import('@xinkjs/xink').XinkAdapter}
 */
const adapter = (options = {}) => {
  return {
    name: '@xinkjs/adapter-bun',
    async adapt(context) {
      context.log('Starting adaptation for Bun...', context);

      const relative_app_path = `./${context.entrypoint.replace(/\\/g, '/').split('.')[0] + '.js'}`;
      const server_entry_filename = options.server_entry ?? 'server.js';
      const server_entry_path = join(context.out_dir, server_entry_filename);

      const port = options?.port ?? process.env.PORT ?? 3000;
      // ... other options ...

      const server_entry_content = `import api from '${relative_app_path}';
import { serve as bunServe } from 'bun';

const options = ${JSON.stringify({ port /* ... other serializable options ... */ })};

console.log(\`Starting server on port \${options.port}...\`);

const server = bunServe({
  port: options.port,
  // ... other options ...
  fetch: api.fetch,
  error: (err) => { /* ... */ }
});

console.log(\`Server listening on http://\${server.hostname}:\${server.port}\`);
`;
      try {
        writeFileSync(server_entry_path, server_entry_content);
        context.log(`Generated server entry point: ${server_entry_path}`);
      } catch (err) {
        console.error(`[Xink Bun Adapter] Failed to write server entry point:`, err);
        throw err; // Re-throw to signal failure
      }
    }
  }
}

export default adapter
