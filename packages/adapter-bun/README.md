# adapter-bun

```js
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-bun'

export default defineConfig(async function () {
  return {
    plugins: [
      xink({ adapter })
    ]
  }
})
```
