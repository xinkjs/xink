---
title: Middleware
---

xin uses the same middleware strategy as SvelteKit (ok, we stole it); you have access to `event` (which includes the Request) and the Response.

```ts
/* middleware/fn1.ts */   // arbitrary path

import type { Handle } from "@xinkjs/xin"

export const middlewareFn1: Handle = (event, resolve) => {
  /** 
   * You can handle requests to endpoints that don't
   * exist.
   */
  if (event.url.pathname === '/synthetic')
    return new Response('Hit synthetic route.')

  /* You can do something with the request/event. */
  event.locals.hello = "world"

  /* Let the router determine a response. */
  const response = resolve(event)

  /* You can do something with the response. */

  return response
}
```

Set your middleware with `.use()`, passing in a comma-separated list of functions.
```ts
// index.ts

import { Xin } from "@xinkjs/xink"
import { middlewareFn1 } from "./middleware/fn1.ts"

const api = new Xin()

api.route("/")
  .get(() => new Response("Hello from /"))

const middlewareFn2 = (event, resolve) => {
  console.log("Hello from middleware")
  return resolve(event)
}

api.use(middlewareFn1, middlewareFn2)

export default api
```