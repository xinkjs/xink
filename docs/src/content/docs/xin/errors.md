---
title: Error Handling
---

## Not Found

Xin provides a default not found response, but you can custom it.

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.onNotFound((event) => {
  console.log('custom not found', event)
  return new Response('Custom Not Found', { status: 404 })
})

export default api
```

## Thrown Errors

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.onError((e, event) => {
  console.log('error', e)

  return new Response(e as string)
})

export default api
```
