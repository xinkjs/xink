---
title: Adapters
---

xink relies on adapters to prep your build for production. We currently support Bun, Cloudflare, and Deno.

> Notice we also use Vite plugins from Cloudflare and Deno. These allow your dev and preview servers to run in native environments.

For Bun and Deno production deployments, a reverse proxy or managed load balancer should normally terminate TLS. Bind the application to a private interface and set `public_origin` to its external HTTPS origin. Cloudflare manages TLS for Workers automatically.

## Bun
```ts
// vite.config.js

import { xink } from '@xinkjs/xink'
import adapter from '@xinkjs/adapter-bun'
import { defineConfig } from 'vite'

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

The Bun adapter can also terminate TLS directly. Set `serve_options.tls.cert_file` and `serve_options.tls.key_file`, or provide `TLS_CERT_FILE` and `TLS_KEY_FILE` when starting the generated server.

## Cloudflare
```ts
// vite.config.js

import { xink } from '@xinkjs/xink'
import adapter from '@xinkjs/adapter-cloudflare'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig(function () {
  return {
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      xink({ 
        adapter
      })
    ]
  }
})
```

## Deno
```ts
// vite.config.js

import { xink } from '@xinkjs/xink'
import adapter from '@xinkjs/adapter-deno'
import deno from '@deno/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig(function () {
  return {
    plugins: [
      deno(),
      xink({ 
        adapter
      })
    ]
  }
})
```

The Deno adapter can also terminate TLS directly. Set `serve_options.tls.cert_file` and `serve_options.tls.key_file`, or provide `TLS_CERT_FILE` and `TLS_KEY_FILE` when starting the generated server. Deno needs environment, network, and certificate-file read permissions.
