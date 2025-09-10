---
title: Adapters
---

xink relies on adapters to prep your build for production. We currently support Bun, Cloudflare, and Deno.

> Notice we also use Vite plugins from Cloudflare and Deno. These allow your dev and preview servers to run in native environments.

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
