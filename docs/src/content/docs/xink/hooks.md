---
title: Hooks
---

You can define hooks for each route with the `HOOKS` export. They are run for any route handler, including `default`. They are run after global middleware but before the route handler.

- Access to `Request`.
- No access to `Response`.
- Functions can be sync or async.
- Highly likely to run in top-down order, as we use `Object.entries()` to process them.

```ts
/* src/routes/route.ts */
import logger from 'pino'


export const HOOKS = {
  state: (event: RequestEvent) => event.locals.state = { some: 'thing' },
  log: () => logger().info('Hello from Pino!'),
  poki: async (event: RequestEvent) => {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/pikachu')
    event.locals.poki = await res.json()
  }
}

export const GET = (event) => { 
  console.log(event.locals.state.some) // thing
  console.log(event.locals.poki) // <some json>
  return 'Hello GET'
}
```
