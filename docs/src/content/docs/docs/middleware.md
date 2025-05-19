---
title: Middleware
---

xink uses the same middleware strategy as SvelteKit (ok, we stole it); you have access to `event`, which includes the Request, and the Response.

In your `src/middleware/middleware.ts` file, you export a function named `handle`.

```ts
/* src/middleware/middleware.ts */
import { type Handle } from '@xinkjs/xink'

export const handle: Handle = (event, resolve) => {
  /** 
   * You can handle requests to endpoints that don't
   * exist in src/routes.
   */
  if (event.url.pathname === '/synthetic')
    return new Response('Hit synthetic route.')

  /* You can do something with the request. */

  /* Let the router determine a response. */
  const response = resolve(event)

  /* You can do something with the response. */

  return response
}
```

For multiple middleware, use the `sequence` helper. In this example, we're defining each middleware in `middleware.ts`, but the `first` and `second` functions could be in another file within the `src/middlware` directory and then imported.

```ts
/* src/middleware/middleware.ts */
import { type Handle, sequence } from '@xinkjs/xink'

const first: Handle = (event, resolve) => {
  console.log('hit first middleware')

  // do something

  return resolve(event)
}

const second: Handle = (event, resolve) => {
  console.log('hit second middleware')
  
  // do something

  return resolve(event)
}

/* Middleware is handled in series. */
export const handle: Handle = sequence(first, second)
```
