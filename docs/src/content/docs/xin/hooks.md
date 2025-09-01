---
title: Hooks
---

You can define one or more hooks for a route and/or it's method handlers (including `fallback`). They are run after global middleware but before the route handler.

- Access to `Request`.
- No access to `Response`.
- Functions can be sync or async.

## Define route hooks
Route hooks run before method hooks.

```ts
/* src/routes/route.ts */
import { Xin } from "@xinkjs/xin"
import logger from "pino"

const api = new Xin()

api.route("/")
  .get(() => new Response("Hello from Xin!"))
  .post() => new Response("Hello from Post /")
  .hook(
    () => { /* I run for all defined methods of this route */ },
    () => { /* Me too! */ }
  )

export default api
```

## Define method hooks
Method hooks run after route hooks. They're a comma-separated list after the method handler.

```ts
/* src/routes/route.ts */
import { Xin } from "@xinkjs/xin"
import logger from "pino"

const api = new Xin()

api.route("/")
  .get(
    () => new Response("Hello from Xin!"), // get handler
    ({ locals }) => { locals.foo = "bar" }, // get hook 1
    () => { logger().info('Hello from Pino!') } // get hook 2
  )

export default api
```
