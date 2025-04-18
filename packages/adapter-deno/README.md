# @xinkjs/adapter-deno

```js
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-deno'

export default defineConfig(async function () {
  return {
    plugins: [
      xink({ adapter })
    ]
  }
})
```
