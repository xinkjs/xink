---
title: Configuration
---

## Vite

xink relies on build adapters for different runtimes and environments, so you have to configure one. We currently support:

- `@xinkjs/adapter-bun`
- `@xinkjs/adapter-cloudflare`
- `@xinkjs/adapter-deno`

The `adapter` is required. All other plugin options are optional and use the defaults shown below.

```ts
type XinkConfig = {
  adapter: (options?: ServeOptions) => XinkAdapter;
  entrypoint?: string; // default 'index.ts'
  out_dir?: string; // default 'build'
  serve_options?: { [key: string]: any; }; // for Bun and Deno users (see next section)
}
```
```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-bun'

export default defineConfig(function () {
  return {
    plugins: [
      xink({ 
        adapter 
      })
    ]
  }
})
```

Our `xk` cli tool also configures Deno and Cloudflare's vite plugins, so that your dev server runs within their native environments.

If you're setting up xink manually, for either Deno or Cloudflare, be sure to also install their respective Vite plugins.

- @cloudflare/vite-plugin
- @deno/vite-plugin

```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
// or import deno from '@deno/vite-plugin'

export default defineConfig(function () {
  return {
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }), // set the environment name for the cloudflare plugin
      xink({ 
        adapter 
      })
    ]
  }
})
```

## `.serve()` options

For Bun and Deno users, you can declare serve options in xink's plugin configuration. Any other runtimes will ignore these options. They configure the generated production server; Vite's `server` and `preview` options configure development and preview.

> Bun supports adding these within your entrypoint's default export, if you'd like to declare them there.

```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-bun'

export default defineConfig(function () {
  return {
    plugins: [
      xink({ 
        adapter,
        serve_options: {
          port: 3500
        }
      })
    ]
  }
})
```

Based on this example entrypoint file,
```ts
import { Xink } from "@xinkjs/xink"

const api = new Xink()

export default api
```
the resulting build server.js file would be:
```js
import api from './index.js';
import { serve as bunServe } from 'bun';

const options = {"port":3500};
const port = options.port ?? process.env.PORT ?? 3000;
const hostname = options.hostname ?? process.env.HOST ?? '0.0.0.0';

const server = bunServe({
  ...options,
  hostname,
  port,
  fetch: api.fetch,
  error: (err) => { /* ... */ }
});

console.log(`Server listening on ${server.url}`);
```

`HOST` and `PORT` are read when the generated server starts if they are not set in `serve_options`.

## Local HTTPS

Development and preview HTTPS use Vite's native configuration. Certificate files are loaded by Vite and are not Xink adapter options.

```ts
import { readFileSync } from 'node:fs'

export default defineConfig({
  server: {
    https: {
      cert: readFileSync('./certs/localhost.pem'),
      key: readFileSync('./certs/localhost-key.pem')
    }
  },
  preview: {
    https: {
      cert: readFileSync('./certs/localhost.pem'),
      key: readFileSync('./certs/localhost-key.pem')
    }
  }
})
```

Vite uses WSS for HMR on an HTTPS server. A reverse proxy in front of Vite must also proxy WebSocket connections.

## Native HTTPS

The Bun and Deno adapters can load a certificate and key when the generated server starts:

```ts
xink({
  adapter,
  serve_options: {
    tls: {
      cert_file: '/run/secrets/tls.crt',
      key_file: '/run/secrets/tls.key'
    }
  }
})
```

Alternatively, set `TLS_CERT_FILE` and `TLS_KEY_FILE` in the server's runtime environment. Both values are required. Xink embeds only paths in generated output, never certificate or private-key contents.

## API Basepath

If you'd like to set a basepath for your entire API, you can do so in your project's entrypoint file. This must be a string that begins with a forward slash (`/`).

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink({
  base_path: "/api"
})

export default api
```

## Allowed Origins

Form submissions are restricted to the request's own origin by default. Add exact, trusted origins when another site needs to submit forms to the API. This does not configure CORS.

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink({
  allowed_origins: ['https://admin.example.com']
})

export default api
```

`check_origin` is deprecated but remains available for backwards compatibility. A non-empty `allowed_origins` array takes precedence over it.

## Public Origin

When HTTPS terminates at a trusted reverse proxy, configure the external origin so request URLs, secure cookies, and origin checks use the browser-facing URL.

```ts
const api = new Xink({
  public_origin: 'https://api.example.com'
})
```

## Cloudflare Workers

To use and type your Bindings(env), create an `api.d.ts` file in your `src` folder or add to the existing file if you're already defining `Api.Locals`.
```ts
/* src/api.d.ts */
declare global {
  namespace Env {
    interface Bindings {
      MY_BUCKET: R2Bucket
      HELLO: string;
    }
  }
  // namespace Api {
  //   interface Locals {}
  // }
}

export {}
// or, if you have a need to type your env within your root index.ts file,
// then you need to export Env so that you can import Env from this file (see below for an example).
export { Env }
```

### Using Bindings(env) and Context(ctx)

Doing this also makes `env` and `ctx` available via `event`.
```ts
/* index.ts */
import { Xink, type Context } from "@xinkjs/xink"
import type { Env } from "./src/api.d.ts"

const api = new Xink()

export default {
  fetch(req: Request, env: Env.Bindings, ctx: Context) {
    return api.fetch(req, { env, ctx })
  }
}
```
