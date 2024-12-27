# @xinkjs/xink

xink is a directory-based filesystem router for APIs, and a Vite plugin. Under the hood, it uses a trie URL router, which is fast and scalable. Supports the bun, deno, and cloudflare workers runtime.

We're currently in the alpha phase of development and welcome contributions. Please see our contributing guide.

## Why use xink?

- [x] Each API endpoint is well organized based on it's directory path and single route file.
- [x] Standard handler-function names (e.g. GET, POST) free you from a lot of naming work.
- [x] Simple data validation with your favorite library.
- [ ] (coming soon) A CLI tool for creating and setting up routes.

## Wishlist

- [x] Support {Bun,Deno}.serve
- [x] Config Vitest tests
- [ ] API Vitest tests
- [ ] CLI tool to setup project
- [ ] docs site
- [ ] Publish to JSR?
- [ ] OpenAPI integration?

## Setup

> Looking forward to our CLI, to make these steps a breeze!

Create a new project, then install Vite v6 and xink as dev dependencies.

```
bun add -D vite @xinkjs/xink
deno add -D npm:vite npm:@xinkjs/xink
[p]npm add -D vite @xinkjs/xink
```

### Vite plugin configuration

Create or ensure there is a "vite.config.js" file in your project's root directory. We show the required options below.

```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'

export default defineConfig(async function () {
  return {
    plugins: [
      await xink({ runtime: 'bun' })
    ]
  }
})
```

```ts
type XinkConfig = {
  runtime: 'bun' | 'cloudflare' | 'deno';
  check_origin?: boolean; // true
  entrypoint?: string;
  out_dir?: string; // build
  serve_options?: { [key: string]: any; };
}
```

For the xink plugin configuration:
- you must provide a `runtime` value
- `entrypoint` is optional, but should be the name of your entrypoint file. Below are the defaults for each supported runtime; so, you only need to set this if you're using a different filename. Note that these must only be filenames, not paths - your entrypoint must always be in the root directory of your project.
  - Bun, `index.ts`
  - Cloudflare, `index.ts`
  - Deno, `main.ts`

### `.serve()` options

For Bun and Deno users, you can declare serve options in xink's plugin configuration. Any other runtimes will ignore these options. Be aware that these options are only relevant for `build` and `preview`, not `dev`.

> Bun supports adding these within your entrypoint's default export, if you'd like to declare them there.

```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'

export default defineConfig(async function () {
  return {
    plugins: [
      await xink({ 
        runtime: 'bun',
        serve_options: {
          port: 3500
        }
      })
    ]
  }
})
```

### tsconfig

If you're using typescript, and would like to use xink's `$lib` alias to reference anything under `src/lib`, then add the below to your tsconfig.

```ts
"extends": "./.xink/tsconfig.json",
```

### Scripts/Tasks

Setup your package.json or deno.json scripts.

#### Bun/Cloudflare

```js
/* package.json */
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
},
```

#### Deno

```js
/* deno.json */
"tasks": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
},
"nodeModulesDir": "auto"
```

## Use

In your project root, create your server's entrypoint file, e.g. `index.[js|ts]`.

```ts
/* entrypoint file */
import { Xink } from '@xinkjs/xink'

const api = new Xink()
await api.init()

export default {
  fetch(req: Request) {
    return api.fetch(req)
  }
}
```

## Create Routes

Routes are created in `src/routes`. Each directory under this path represents a route segment.

At the end of a route path, a javascript or typescript `route` file should export one or more functions for each HTTP method it will serve. You can also define a default export, for any unhandled request methods.

xink supports these route exports: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'default'

### Route Types

xink uses the [xin](https://github.com/xinkjs/xin) URL router, which was forked from @medleyjs/router. However, since xink is designed for directory-based routing, we use brackets to define special route segments for parameters, etc.

xin's currently supported route types, in order of match priority:
- static: `/hello/there/world`
- specific: `/hello/miss-[name]`
- matcher: `/hello/[name=word]` (where 'word' references a function, which tests if the value of the `name` parameter matches)
- dynamic: `/hello/[name]`
- rest: `/hello/[...rest]` (essentially a wildcard, but must be at the end of a route)

```ts
/* src/routes/blog/[article]/route.ts */
import { type RequestEvent } from '@xinkjs/xink'

export const GET = async ({ params, text }: RequestEvent) => {
  const article = await getArticle(params.article)

  return text(`You asked for ${article.title}`)
}

export const POST = async ({ request, json }: RequestEvent) => {
  return json(await request.json())
}

export default ({ request, text }: RequestEvent) => {
  return text(`Hello ${request.method}`)
}
```

### Route Param Matchers

You can think of these as validators for route parameter segments (`params`). This feature came before [validators](#validation); you don't need to use both to validate your params. However, one advantage of a matcher is that it can be defined once and used for as many routes as you'd like.

You can validate route params by creating files in `src/params`. Each file in this directory needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruits.ts */
export const match = (param: string) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruit=fruits]/route.ts`, where the label on the right side of the `=` character should be the same as the filename (minus the extension) in `src/params`.

So, for the fruits example, if a request was made to `/apple`, it would match, but a request to `/banana` would not.

xin provides the following built-in matchers, but they can be overridden by creating your own file definitions:

```js
/* word */
(param) => /^\w+$/.test(param)
```
```js
/* letter */
(param) => /^[a-z]+$/i.test(param)
```
```js
/* number */
(param) => /^\d+$/.test(param)
```

### Rest (Wildcard) Segments

Because of the way the xin URL router works, the rest segment's param is accessed with `'*'`.

```ts
/* src/routes/hello/[...rest]/route.js */
export const GET = ({ params }) => {
  return new Response(`Hello ${params['*']}!`) // not `params.rest`
}
```

## Middleware
xink uses the same middleware strategy as SvelteKit (ok, we stole it). You export a single function named `handle`. Place your middleware in `src/middleware`, with the main file being `middleware.[js|ts]`. This gives you access to both the event (includes the Request) and the Response.

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

For multiple middleware, use the `sequence` helper. Each middleware function should take in an `event` and `resolve` function, and return `resolve(event)`. For this example, we're defining each middleware in `middleware.ts`, but the `first` and `second` functions could easily be in another file and imported.

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

## Route Hooks

You can define hooks for each endpoint. These are called after global middleware but before the route handler. Validation also happens before these are called, so you have access to validated data (see next section).

The `HOOKS` export must be a function, which returns an object of hooks. This is a library preference that ensures all route exports are functions.

- access to `event`; if you change it, then you must return it.
- if not returning `event`, you must return `null`.
- no access to the response.
- can by sync or async functions.
- are not guaranteed to run in any particular order.

```ts
/* src/routes/route.ts */
import logger from 'pino'

export const GET = () => { return new Response('Hello') }

export const HOOKS = () => {
  return {
    state: (event: RequestEvent) => {
      event.locals.state = { some: 'state' }

      return event
    },
    log: () => {
      logger().info('Hello from Pino!')

      return null
    },
    poki: async (event: RequestEvent) => {
      const res = await fetch('https://pokeapi.co/api/v2/pokemon/pikachu')
      event.locals.poki = await res.json()

      return event
    }
  }
}
```

## Validation

Validate incoming route data for types `form`, `json`, route `params`, or `query` search params. Validated data is available as an object within `event.valid.[form|json|params|query]`.

Your validators are part of hooks. For each handler, define a function that returns an object of validated data for the data type. Any thrown errors can be handled by `handleError()` (see further below).

In the Zod example below, only json data, which matches your schema, will be available in `event.valid.json`; in this case, for POST requests.

```js
/* src/routes/route.js */
import { z } from 'zod'

const VALIDATORS = {
  POST: {
    json: (z.object({
      hello: z.string(),
      goodbye: z.number()
    })).parse
  }
}

export const HOOKS = () => {
  return {
    VALIDATORS,
    someHookFn: () => null
  }
}

/**
 * Assuming the following json is passed in:
 * {
 *    hello: 'world',
 *    goodbye: 42,
 *    cya: 'later'
 * }
 */
export const POST = async (event) => {
  const received_json = event.valid.json
  // { hello: 'world', goodbye: 42 } }

  /* Do something and return a response. */
}
```

Instead of using a validation library, you can also define a normal function with your own validation logic, then return the validated data as an object.

> We clone the request during validation. This allows you to access the original request body within route handlers, if desired.

### Using types with validation

```js
import * as v from 'valibot'
import type { RequestEvent, Validators } from '@xinkjs/xink'

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.number()
})
type PostTypes = {
  json: v.InferInput<typeof post_json_schema>;
}

const VALIDATORS: Validators = {
  POST: {
    json: v.parser(post_json_schema)
  }
}

export const HOOKS = () => {
  return { VALIDATORS }
}

export const POST = async (event: RequestEvent<PostTypes>) => {
  const valid_json = event.valid.json
  // IDE autocomplete for "hello" and "goodbye" via valid_json.

  /* Do something and return a response. */
}
```

## Handling Errors

If you need to handle thrown errors separately, especially for errors from validation libraries, create an `error.[ts|js]` file in `src`, that exports a `handleError` function. This can also be used to handle other errors not caught by a try/catch.

```ts
/* src/error.ts */
import { json } from "@xinkjs/xink"
import { ZodError } from "zod"

export const handleError = (e) => {
  if (e instanceof ZodError)
    return json({ data: null, error: e })
}
```

## Setting Headers

`event.setHeaders`

> You cannot set cookies using this method, but rather with [`event.cookies`](#cookie-handling).

```js
/* src/routes/route.js */
export const GET = ({ setHeaders }) => {
  setHeaders({
    'Powered-By': 'xink'
  })
}
```

## Cookie Handling

`event.cookies`, with methods `delete`, `get`, `getAll`, and `set`.

```js
/* src/routes/route.js */
export const GET = ({ cookies }) => {
  cookies.set('xink', 'is awesome', { maxAge: 60 * 60 * 24 * 365 })
  const cookie_value = cookies.get('xink')
  const all_cookies = cookies.getAll()
  cookies.delete('xink')
}
```

## Locals

`event.locals` is available for you to define custom information per request. These are typically defined in middleware and used in route handlers.

```ts
/* src/middleware/middleware.ts */
export const handle: Handle = (event, resolve) => {
  event.locals.xink = "some value"

  return resolve(event)
}

/* src/routes/route.ts */
import { type RequestEvent } from '@xinkjs/xink'

export const GET = (event: RequestEvent) => {
  console.log(event.locals.xink) // some value
}
```

To type your locals, create an `api.d.ts` file in your `src` folder.
```ts
declare global {
  namespace Api {
    interface Locals {
      xink: string;
    }
  }
}

export {}
```

## Import Aliases

- Use `$lib` for importing from `src/lib`, instead of having to deal with things like `../../utils.ts`. This requires extending your tsconfig.json file; see [doc](#tsconfig) for setup.
  ```js
  import { thing } from '$lib/utils.ts'
  ```

## Helper Functions

All helper functions are available within `event` but can also be top-level imported if needed.

### html
Returns an html response. It sends a `Content-Length` header and a `Content-Type` header of `text/html`.
```js
export const GET = (event) => { 
  return event.html(`<div>You chose ${event.params.fruit}</div>`)
}
```

### text
Returns a text response. By default, it sends a `Content-Length` header and a `Content-Type` header of `text/plain`.
```js
export const GET = (event) => {
  return event.text(`Hello World!`)
}
```

### json
Returns a json response. By default, it sends a `Content-Length` header and a `Content-Type` header of `application/json`.
```js
export const GET = (event) => {
  return event.json({ hello: 'world' })
}
```

### redirect
Returns a redirect response.
```js
export const GET = (event) => {
  return event.redirect(status: number, location: string)
}
```

## Cloudflare Workers

To use and type your Bindings(env), create an `api.d.ts` file in your `src` folder or add to the existing file if you're already defining `Api.Locals`.
```ts
/* src/api.d.ts */
declare global {
  namespace Env {
    interface Bindings {
      MY_BUCKET: R2Bucket
      HELLO: string;
    }
  }
  // namespace Api {
  //   interface Locals {}
  // }
}

export {}
// or, if you have a need to type your env within your root index.ts file,
// then you need to export Env so that you can import Env from this file (see below for an example).
export { Env }
```

### Using Bindings(env) and Context(ctx)

Doing this also makes `env` and `ctx` available via `event`.
```ts
/* index.ts */
import { Xink, type Context } from "@xinkjs/xink"
import type { Env } from "./src/api.d.ts"

const api = new Xink()
await api.init()

export default {
  fetch(req: Request, env: Env.Bindings, ctx: Context) {
    return api.fetch(req, env, ctx)
  }
}
```

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)). If you don't want this, set `check_origin` to `false` in the xink plugin configuration.
- etag helper: returns 304 with no body, instead of 200 with body, if request etag equals response etag.

## Types

```ts
type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
interface Context {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
type Cookies = {
  delete(name: string, options?: SerializeOptions): void;
  get(name: string, options?: ParseOptions): string | undefined;
  getAll(options?: ParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: SerializeOptions): void;
}
type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
type Params = { [key: string]: string };
type Store = { [key: string]: any };

interface AllowedValidatorTypes {
  form?: any;
  json?: any;
  params?: any;
  query?: any;
}
interface RequestEvent<V extends AllowedValidatorTypes = AllowedValidatorTypes> {
  cookies: Cookies;
  ctx: Context;
  env: Env.Bindings;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: (data: any, init?: ResponseInit | undefined): Response;
  json: (data: any, init?: ResponseInit | undefined): Response;
  locals: Api.Locals,
  params: Params;
  redirect: (status: number, location: string): never;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
  text: (data: string, init?: ResponseInit | undefined): Response;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: V
}

interface Validators {
  GET?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  POST?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  PUT?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  PATCH?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  DELETE?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  HEAD?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  OPTIONS?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
}
```

## Attributions
xink stands on the shoulders of giants. A special shoutout and tip of the hat goes to [SvelteKit](https://github.com/sveltejs/kit), as I used some of their code for various things; as it was not feasible to fork their code directly, and there's no reason to re-invent the wheel. Therefore, I've added a copyright for them in the license and marked relevant code with a short attribution.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
