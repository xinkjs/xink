---
title: Quickstart
---

## Install and basic use

```bash
bun add @xinkjs/xin
```

```ts
// index.ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.route("/")
  // methods must be chained from .route() and then each other
  .get(() => new Response("Hello from Xin!"))
  .post(() => new Response("Hello from post /"))

export default api
```

The following handler methods are available: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.options()`, `.head()`, `.fallback()`


## Configuration

There are two options: `check_origin` and `base_path`.

### Check origin

Determines CORS behavior, and default is `true`. Make sure you know what you're doing when setting this to `false`.

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin({ check_origin: false })

export default api
```

### Base path
Set this option if you want your API to have a common path prefix.

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin({ base_path: "/api" })

api.route("/")
  .get(() => new Response("Hello from /api"))

export default api
```

If you're creating multiple routers and merging them, you can use this option as a convenience mechanism.

```ts
// routes/user.ts
import { Xin } from "@xinkjs/xin"

const userRouter = new Xin({ base_path: "/user" })

userRouter.route("/")
  .get(() => new Response("Hello from /user"))
userRouter.route("/:id")
  .get(() => new Response("Hello from /user/:id"))

export { userRouter }
```
```ts
// index.ts
import { Xin } from "@xinkjs/xin"
import { userRouter } from "./routes/user.ts"

const api = new Xin()
api.route("/")
  .get(() => new Response("Hello from /"))

// splice a router
api.router(userRouter)

export default api
```

When merging routers, if the destination router has `base_path` set, the source router will inherit it.

```ts
// routes/user.ts
import { Xin } from "@xinkjs/xin"

const userRouter = new Xin({ base_path: "/user" })

userRouter.route("/")
  .get(() => new Response("Hello user"))
userRouter.route("/:id")
  .get(({ params }) => new Response(`Hello user ${params.id}`))

export { userRouter }
```
```ts
// index.ts
import { Xin } from "@xinkjs/xin"
import { userRouter } from "./routes/user.ts"

const api = new Xin({ base_path: "/api" })
api.route("/")
  .get(() => new Response("Hello from /api"))

// splice a router
api.router(userRouter)

// results in the user paths being: /api/user and /api/user/:id

export default api
```
