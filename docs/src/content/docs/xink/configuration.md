---
title: Configuration
---

## Vite

xink relies on build adapters for different runtimes and environments, so you have to configure one. We currently support:

- `@xinkjs/adapter-bun`
- `@xinkjs/adapter-cloudflare`
- `@xinkjs/adapter-deno`

You can set the below options in the plugin's configuration.

```ts
type XinkConfig = {
  adapter: (options?: ServeOptions) => XinkAdapter;
  entrypoint?: string; 
  out_dir?: string;
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

## `.serve()` options

For Bun and Deno users, you can declare serve options in xink's plugin configuration. Any other runtimes will ignore these options. Be aware that they're only relevant for `build`, `preview` and `start`.

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

const options = {"port":3500,"hostname":"0.0.0.0"};

console.log(`Starting server on port ${options.port}...`);

const server = bunServe({
  ...options,
  fetch: api.fetch,
  error: (err) => { /* ... */ }
});

console.log(`Server listening on http://${server.hostname}:${server.port}`);
```

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

## Check Origin

You can tell Xink to not check origins for POST requests. The default is `true`.

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink({
  check_origin: false
})

export default api
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
