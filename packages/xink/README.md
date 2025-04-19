# @xinkjs/xink

xink is a directory-based filesystem router for APIs, acting as a Vite plugin. Under the hood, it uses a trie URL router, which is fast and scalable. It supports the bun, cloudflare, and deno runtimes.

We're currently in the alpha phase of development and welcome contributions. Please see our contributing guide.

## Why use xink?

- Your directory structure defines your API paths<sup>*</sup>.
- An endpoint's handlers are well organized in single route file.
- HTTP-based handler names (e.g. GET, POST) free you from a lot of naming work.
- Simple data validation with your favorite library.
- Easy OpenAPI integration.
- No-fuss setup with our `xk` CLI tool.
- Native handling of 404 and 405 (Method Not Allowed) responses.

<small><sup>*</sup> - requires a route file at the end of each path.</small>

## Wishlist

- [x] Adapters for other runtimes and environments (help wanted)
- [x] Support {Bun,Deno}.serve
- [x] Config Vitest tests
- [ ] API Vitest tests
- [x] CLI tool to setup project
- [ ] Official docs site
- [ ] Publish to JSR?
- [x] OpenAPI integration?

## Setup

```bash
npx xk create my-api
```

### Basepath

If you'd like to set a basepath for your entire API, you can do so in your project's entrypoint file. This must be a string that begins with a forward slash (`/`).

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink()

api.path('/api')

export default {
  fetch(req: Request) {
    return api.fetch(req)
  }
}
```

## Create Routes

Routes are created in `src/routes`. Each directory under this path represents a route segment.

At the end of a route path, a javascript or typescript `route` file should export one or more functions. These functions are named based on the HTTP method they serve. You can also define a default export, for any unhandled request methods. A route will not be registered unless this file exists.

xink supports these route handler exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `default`

```ts
/* route endpoint example, src/routes/route.ts */
import type { RequestEvent } from '@xinkjs/xink'

export const GET = (event: RequestEvent) => {
  return event.text('Welcome to xink!')
}

/* handle all other http methods */
export default (event: RequestEvent) => {
  return event.json({ message: `Hello ${event.method}!` })
}
```

### Route Types

Currently supported route types, in order of match priority:
- static: `/hello/there/world`
- specific: `/hello/miss-[name]` (combo of static and dynamic segment)
- matcher: `/hello/[name=word]` (where 'word' references a function, which tests if the value of the `name` parameter matches)
- dynamic: `/hello/[name]`
- rest: `/hello/[...rest]` (essentially a wildcard, but must be at the end of a route)

```ts
/* src/routes/blog/[article]/route.ts */
import { type RequestEvent } from '@xinkjs/xink'

export const GET = async ({ params, html }: RequestEvent) => {
  const article = await getArticle(params.article)

  return html(article)
}
```

### Rest (Wildcard) Segments

Because of the way the xin URL router works, the rest segment's param is accessed with `'*'`.

```ts
/* src/routes/hello/[...rest]/route.js */
export const GET = ({ params }) => {
  return new Response(`Hello ${params['*']}!`) // not `params.rest`
}
```

### Route Param Matchers

You can think of these as validators for route parameter segments (`params`). This feature came before [validators](#validation); you don't need to use both to validate your params. However, one advantage of a matcher is that it can be defined once and used for as many routes as you'd like.

You can validate route params by creating files in `src/params`. Each file in this directory needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

This feature does not populate `event.valid`, like validators does.

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

## Hooks

You can define hooks for each route, with the `HOOKS` export. They are run for any configured method for a route, including the `default` export. They are called after global middleware but before the route handler. Validation also happens before they are called, so you have access to validated data (see next section).

- Have access to `Request`.
- Do not have access to `Response`.
- Must return either `null` or `event`. If `event` is changed, it needs to be returned in order to access it in handlers.
- Functions can be sync or async.
- Are not guaranteed to run in any particular order.

```ts
/* src/routes/route.ts */
import logger from 'pino'

export const HOOKS = {
  state: (event: RequestEvent) => {
    event.locals.state = { some: 'thing' }

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

export const GET = (event) => { 
  console.log(event.locals.state.some) // thing
  console.log(event.locals.poki) // <some json>
  return new Response('Hello GET') 
}

export const POST = (event) => { 
  console.log(event.locals.state.some) // thing
  console.log(event.locals.poki) // <some json>
  return new Response('Hello POST') 
}
```

## Validation

Validate incoming route data for types `form`, `json`, route `params`, or `query` search params. Validated data is available as an object within `event.valid`. You can validate using either validator functions or schemas.

Any thrown errors can be handled by `handleError()` (see further below).

### Using Validators

`VALIDATORS` is a built-in `HOOKS` object. For each route handler and data type, you can define a function that returns an object of validated data. 

In the Zod example below, only json data which matches your schema, will be available in `event.valid.json`; in this case, for POST requests.

```js
/* src/routes/route.js */
import { z } from 'zod'

const VALIDATORS = {
  POST: {
    json: (z.object({
      hello: z.string(),
      goodbye: z.number()
    })).parse // notice we pass a parse function, not just the schema.
  }
}

export const HOOKS = {
  VALIDATORS,
  someOtherHook: () => null
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
  console.log(event.valid.json)
  // { hello: 'world', goodbye: 42 } }

  /* Do something and return a response. */
}
```

Instead of using a validation library, you can also define a normal function with your own validation logic, then return the validated data as an object.

> We clone the request during validation. This allows you to access the original request body within route handlers, if desired.

#### Validators With Types

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

export const HOOKS = {
  VALIDATORS
}

export const POST = async (event: RequestEvent<PostTypes>) => {
  // IDE autocomplete/types for "hello" and "goodbye" for event.valid.json.
  const valid_json = event.valid.json

  /* Do something and return a response. */
}
```

### Using Standard Schema

`SCHEMAS` is a built-in `HOOKS` object. For each route handler and data type, you can define a schema to validate data. You can only use SCHEMAS when using a validation library that is [Standard Schema](https://standardschema.dev) compliant. You can use types with this as well.

```js
/* src/routes/route.js */
import * as v from 'valibot'

const SCHEMAS = {
  POST: {
    json: v.object({
      hello: v.string(),
      goodbye: v.number()
    })
  }
}

export const HOOKS = {
  SCHEMAS,
  someOtherHook: () => null
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
  console.log(event.valid.json)
  // { hello: 'world', goodbye: 42 } }

  /* Do something and return a response. */
}
```

## Handling Errors

If you need to handle thrown errors separately, especially for errors from validation libraries, create an `error.[ts|js]` file in `src`, that exports a `handleError` function. This can also be used to handle other errors not caught by a try/catch.

### for VALIDATORS Errors
```ts
/* src/error.ts */
import { json } from "@xinkjs/xink"
import { ZodError } from "zod"

export const handleError = (e) => {
  if (e instanceof ZodError)
    return json({ data: null, error: e })
}
```

### for SCHEMAS Errors
```ts
import { json, StandardSchemaError } from "@xinkjs/xink"

export const handleError = (e: any) => {
  if (e instanceof StandardSchemaError)
    return json({ 
      data: null, 
      error: JSON.parse(e.message) // use JSON.parse to return as an array
    })

  /* Handle other errors. */
  return json({ 
    data: null, 
    error: e.message 
  })
}
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
```ts
export const GET = (event) => {
  return event.redirect(status: number, location: string)
}
```

## Setting Headers

`event.setHeaders`

> You cannot set cookies using this method; instead, use [`event.cookies`](#cookie-handling).

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

## OpenAPI

xink makes it easy for you to create OpenAPI reference docs, powered by [Scalar](https://scalar.com/) to render them in a browser.

### Endpoint configuration

First, define your `OPENAPI` export within each route file.

```js
/* src/routes/route.ts */
import * as v from 'valibot'
import { toJsonSchema } from "@valibot/to-json-schema"

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.string()
})

const post_res_schema = v.object({
  data: v.nullable(v.object({
    message: v.string()
  })),
  error: v.nullable(v.unknown())
})

/* Define route endpoints. */
...

/* Define OpenAPI definitions. */
export const OPENAPI = {
  post: {
    summary: "Post root route",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: toJsonSchema(post_json_schema)
        }
      }
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: toJsonSchema(post_res_schema)
          }
        }
      }
    }
  }
}
```

### API configuration

Then, within your project's entrypoint file, define your desired path to the OpenAPI docs, and any optional metadata. When the router is started, you can visit the reference docs in a browser - e.g. http://localhost:3000/reference

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink()

api.openapi({ 
  path: "/reference", 
  data: { 
    "openapi": "3.1.0",
    "info": {
      "title": "Xink API",
      "version": "0.0.0"
    }
  }
})

export default {
  fetch(req: Request) {
    return api.fetch(req)
  }
}
```

## 404 and 405 handling

If a requested route does not exist, a 404 is returned.

If a requested route exists but there is no matching or default method, a 405 is returned with an `Allow` header indicating the available methods.

## etag handling

If a request header of `if-none-match` exists and matches the response `etag` header, a 304 is returned with the following headers (if they exist on the response):

`cache-control`, `content-location`, `date`, `expires`, `set-cookie`, `vary`

## Configuration

You can set these in the plugin's configuration. Note that you must pass an adapter.

```ts
type XinkConfig = {
  adapter: (options?: any) => XinkAdapter;
  check_origin?: boolean;
  entrypoint?: string; 
  out_dir?: string;
  serve_options?: { [key: string]: any; }; // for Bun and Deno users (see next section)
}
```
```ts
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

### `.serve()` options

For Bun and Deno users, you can declare serve options in xink's plugin configuration. Any other runtimes will ignore these options. Be aware that these options are only relevant for `build`, `preview` and `start`.

> Bun supports adding these within your entrypoint's default export, if you'd like to declare them there.

```ts
/* vite.config.js */
import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from '@xinkjs/adapter-bun'

export default defineConfig(async function () {
  return {
    plugins: [
      xink({ 
        adapter,
        serve_options: {
          port: 3500
        }
      })
    ]
  }
})
```

## Build

To build the api, run the relevant command per runtime:

- `bun run build`
- `deno task build`
- `npm run build`

## Preview

To preview the api with vite:

- `bun run preview`
- `deno task preview`
- `npm run preview`

To preview the api in your runtime's environment:

- `bun run start`
- `deno task start`
- `wrangler dev`

## Deploy

For Cloudflare, you can deploy your api with `wrangler deploy`.

## Import Aliases

Use `$lib` for importing from `src/lib`, instead of having to deal with things like `../../utils.ts`. This requires extending your tsconfig.json file. If you used the `xk` CLI tool to create your project, this should already be done for you.

```ts
"extends": "./.xink/tsconfig.json",
```
```js
import { thing } from '$lib/utils.ts'
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

export default {
  fetch(req: Request, env: Env.Bindings, ctx: Context) {
    return api.fetch(req, { env, ctx })
  }
}
```

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)). If you don't want this, set `check_origin` to `false` in the xink plugin configuration.

## Types

```ts
type XinkConfig = {
  adapter: (options?: any) => XinkAdapter; // null
  check_origin?: boolean; // true
  entrypoint?: string; // index.ts
  out_dir?: string; // build
  serve_options?: { [key: string]: any; };
}

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
  GET?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  POST?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PUT?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PATCH?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  DELETE?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  HEAD?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  OPTIONS?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
```

## Attributions
xink stands on the shoulders of giants. A special shoutout and tip of the hat goes to [SvelteKit](https://github.com/sveltejs/kit), as I used some of their code for various things; as it was not feasible to fork their code directly, and there's no reason to re-invent the wheel. Therefore, I've added a copyright for them in the license and marked relevant code with a short attribution.

Thanks to [Deigo Rodríguez Baquero](https://github.com/DiegoRBaquero) for donating the `xk` npm package.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
