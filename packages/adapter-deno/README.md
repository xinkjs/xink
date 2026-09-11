# @xinkjs/adapter-deno

```js
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-deno'
import deno from '@deno/vite-plugin'

export default defineConfig(async function () {
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

## HTTPS

For production, prefer a TLS-terminating reverse proxy and configure Xink's `public_origin`. To terminate TLS in Deno directly, provide certificate file paths:

```js
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

The generated server also reads `TLS_CERT_FILE` and `TLS_KEY_FILE` at startup. Certificate contents are never embedded in the build output. Run it with `--allow-env`, `--allow-net`, and read access to the certificate files. `HOST` and `PORT` are read at startup when they are not explicitly configured.
