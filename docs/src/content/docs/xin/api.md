---
title: API
---

### Xin class

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()
```

You can pass a configuration object when creating the new instance.
```ts
{
  check_origin: boolean; // protect against CSRF attacks; default true
  base_path: string; // the router's base path for all created routes; default ''
}
```

#### Set middleware
Pass a comma-separated list of middleware functions to `.use()`. Middleware is called during every request, and can return a `Response` if desired.

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.use(
  (event, resolve) => {
    // handle requests to routes that aren't registered in Xin
    if (event.url.pathname === "/synthetic")
      return new Response("Hit synthetic route")

    return resolve(event)
  },
  async (event, resolve) => {
    event.locals.hello = "world"

    await someCall()

    return resolve(event)
  }
)
```

#### Configure OpenAPI and Scalar

Configure OpenAPI path and metadata; along with Scalar options (see https://guides.scalar.com/scalar/scalar-api-references/configuration#list-of-all-attributes)

```ts
openapi(metadata: { 
  path: string; // the path users can go to see your API docs; default '' (i.e disabled)
  data?: {
    openapi?: string; // OpenAPI version; default '3.1.0'
    info?: { 
      title?: string; // default undefined
      version?: string; // default undefined
    }
  },
  scalar?: Partial<ApiReferenceConfiguration> // Scalar options
}): void;
```
```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.openapi({
  path: "/docs",
  data: {
    info: {
      title: "My Api",
      version: "0.1.0"
    }
  },
  scalar: { theme: "kepler" }
})

export default api
```

#### Configure a route with OpenAPI data

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.openapi({
  path: "/docs"
})

// OpenAPI spec
const openapi = {
  tags: ['Root'],
  get: {
    tags: ['Gets'],
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: some-json-schema
          }
        }
      }
    }
  }
}

api.route("/", openapi)
```

#### **getRoutes**

Get all of the routes for the trie.

```js
const routes = xi.getRoutes()
```

Returns: `Array<{pattern: string, methods: string[]}>`.

#### **router**

Merge a router into another. If the destination router has a `base_path` set, the source router will inherit that path.

```js
import { Xin } from "@xinkjs/xin"

const api = new Xin({ base_path: '/api' })
const userApi = new Xin()

userApi.route("/user")
  .get(() => new Response("Welcome to user!"))

api.router(userApi)

// a request to "/api/user" would be found, because of the inherited base path
// a request to "/user" would not be found
```

#### Registering route handlers and hooks

Use the above handler methods to register handlers and hooks for a route method.

```js
// standalone handler
import { Xin } from '@xinkjs/xin'

const api = new Xin()
api.route('/')
  .get(() => new Response('Hello GET!))
```
```js
// handler and hooks
import { Xin } from '@xinkjs/xin'

const api = new Xin()
api.route('/')
  .get(
    (event) => new Response(`Hello GET. Event is ${event}`), // handler
    () => console.log('A route method hook'), // first hook
    async (event, next) => {
      const res = await fetch('https://example.com')
      event.locals.res = await res.json() // `locals` is a contrived object
    } // second hook
  )
```

Parameters:
  - `handler` (`Handler`): The function used to handle a `Request`.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Handler= (event: RequestEvent) => MaybePromise<Response | any>;
    ```
  - `...hooks`: A comma-separated list of hook functions to register for the method.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook= (event: RequestEvent, next?: () => Promise<void>) => MaybePromise<void | any>;
    ```
> For hooks, we accomodate for a "next" function if you choose to try and use it. This is experimental and we're looking for feedback.

#### Registering hooks for all methods of a route

In the previous section, we showed how to define hooks that only run for a specific method. You can also define hooks that run for all defined route methods, by using `hook()`. This method also returns the route's store, so it's chainable.

```js
import { Xin } from '@xinkjs/xin'

const api = new Xin()

api.route('/')
  .post(() => new Response())
  .get(() => new Response())
  .hook(
    () => console.log('Run for all defined route methods'),
    () => console.log('Another route-level hook')
  )
```

Parameters:
  - `...hooks`: A comma-separated list of hook functions to register for the route.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook = (event: Record<string, any>, next?: () => MaybePromise<void>) => MaybePromise<void>;
    ```

#### **route**

Register a route. Use chaining to declare method handlers.

```js
api.route('/user')
  .get(() => new Response('Hello GET, from /user'))
  .post(() => new Response('Hello POST, from /user'))
```

Parameters:
  - `path` (`string`): The URL path to register. Must start with a `/`.

Returns: The route's store instance (`this`), allowing for method chaining.

Throws:
  - `Error` if `path` does not start with a `/`.

#### **router**

Merge a router into another. If the destination router has a `base_path` set, the source router will inherit that path.

```js
import { Xin } from "@xinkjs/xin"

const api = new Xin({ base_path: "/api" })
const userApi = new Xin()

userApi.route("/user")
  .get(() => new Response("Welcome to user!"))

api.router(userApi)
api.find("/api/user") // found; inherited base_path
api.find("/user") // not found
```

### Store class

#### Handler methods

There is a class method for all allowed handler methods. They mostly equate to their HTTP method equivalents:

`get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `head()`, `fallback()`

Each one returns the route's store, allowing for method chaining. The `fallback` helper is used to define a handler for any valid methods that aren't explicitly defined.

Each one is overloaded, to accomodate passing in a schema which will be used to validate data. Also notice that a comma-separated list of method hooks can be passed in, allowing for multiple per method.
```ts
declare class Store {
  get<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler, ...hooks: Hook[]): Store;
  get<ReqSchema = unknown, ResSchema = unknown>(handler: Handler, ...hooks: Hook[]): Store;
}
```

#### Registering route handlers and hooks

Use the above handler methods to register handlers and hooks for a route method.

```js
// standalone handler
import { Xin } from '@xinkjs/xin'

const api = new Xin()
api.route('/')
  .get(() => new Response('Hello GET!))
```
```js
// handler and hooks
import { Xin } from '@xinkjs/xin'

const api = new Xin()
api.route('/')
  .get(
    (event) => new Response(`Hello GET. Event is ${event}`), // handler
    () => console.log('A route method hook'), // first hook
    async (event, next) => {
      const res = await fetch('https://example.com')
      event.locals.res = await res.json()
    } // second hook
  )
```

Parameters:
  - `handler` (`Handler`): The function used to handle a `Request`.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Handler= (event: RequestEvent) => MaybePromise<Response | any>;
    ```
  - `...hooks`: A comma-separated list of hook functions to register for the method.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook = (event: RequestEvent, next?: () => Promise<void>) => MaybePromise<void | any>;
    ```
> For hooks, we accomodate for a "next" function if you choose to try and use it. This is experimental and we're looking for feedback.

```ts
interface RequestEvent<
  ReqT extends SchemaDefinition = SchemaDefinition, 
  ResT = any, Platform extends PlatformContext = PlatformContext
> {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: (data: ResT, init?: ResponseInit) => Response;
  locals: Api.Locals;
  params: Record<string, string | undefined>;
  platform: Platform;
  redirect: typeof redirect;
  request: Request;
  setHeaders: (headers: Record<string, any>) => void;
  store: Store | null;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: ReqT;
}
```

#### Registering hooks for all methods of a route

In the previous section, we showed how to define hooks that only run for a specific method. You can also define hooks that run for all defined route methods, by using `hook()`. This method also returns the route's store, so it's chainable.

```js
import { Xin } from '@xinkjs/xin'

const api = new Xin()

api.route('/')
  .post(() => new Response())
  .get(() => new Response())
  .hook(
    () => console.log('Run for all defined route methods'),
    () => console.log('Another route-level hook')
  )
```

Parameters:
  - `...hooks`: A comma-separated list of hook functions to register for the route.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook = (event: RequestEvent, next?: () => MaybePromise<void>) => MaybePromise<void>;
    ```
