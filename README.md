# @xinkjs/xink

xink is a directory-based API router and a Vite plugin.

It requires Vite v6, which is currently in beta.

## Road to Alpha

- [x] Bun
- [x] Deno
- [x] Cloudflare Workers - `request` only; no bindings (`env`) or context (`ctx`)

## Wishlist

- [x] Support {Bun,Deno}.serve
- [ ] Cloudflare Workers
- [ ] Publish to JSR
- [ ] OpenAPI integration
- [ ] Vitest tests
- [ ] CLI tool to setup project

## Route Types

xink uses the [xin](https://github.com/xinkjs/xin) URL router, which was forked from @medleyjs/router. However, since xink is designed for directory-based routing, we use brackets to define special route segments for parameters, etc.

xin's currently supported route types, in order of match priority:
- static: `/hello/there/world`
- specific: `/hello/miss-[name]`
- matcher: `/hello/[name=word]` (where 'word' references a function, which tests if the value of the `name` parameter matches)
- dynamic: `/hello/[name]`
- rest: `/hello/[...rest]` (essentially a wildcard, but must be at the end of a route)

## Setup

Create a new project, then install Vite v6 and xink as dev dependencies.

```
bun add -D vite@beta @xinkjs/xink
deno add -D npm:vite@beta npm:@xinkjs/xink
[p]npm add -D vite@beta @xinkjs/xink
```

### Vite plugin configuration

Create or ensure there is a "vite.config.js" file in your project's root directory.

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

### tsconfig

If you're using typescript, add the below to your tsconfig. This will satisfy types when using the `$lib` alias in your code.

```ts
"extends": "./.xink/tsconfig.json",
```

### Scripts/Tasks

Setup your package.json or deno.json scripts. If you change your build output directory, be sure to adjust accordingly.

> In the future, we hope to have a cli installer which sets these automatically.

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

We are expecting a default export from this file, so you can't explicitly use `Bun.serve()` or `Deno.serve()`. However, you can declare options for `.serve()` in the xink plugin config.

> Bun does support declaring serve options within a default export, if you'd like to add them below `fetch() {}`.

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

Routes are created in `src/routes`. Each folder under this path represents a route segment.

At the end of a route segment, a javascript or typescript `route` file should export one or more functions for each HTTP method it will serve. You can also define a `fallback`, for any unhandled request methods.

xink supports these verbs and function names: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'

```ts
/* src/routes/blog/[article]/route.ts */
import { json, text, type RequestEvent } from '@xinkjs/xink'

export const GET = async ({ params }: RequestEvent) => {
  const article = await getArticle(params.article)

  return text(`You asked for ${article.title}`)
}

export const POST = async ({ request }: RequestEvent) => {
  return json(await request.json())
}

export const fallback = ({ request }: RequestEvent) => {
  return text(`Hello ${request.method}`)
}
```

## Middleware
xink uses the same middleware strategy as SvelteKit. You export a single function named `handle`. Place your middleware in `src/middleware`, with the main file being `middleware.[js|ts]`.

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

## `.serve()` options

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

## Setting Headers

Use `event.setHeaders()` to set response headers. Be aware that you cannot set cookies using this method, but should instead use [`event.cookies`](#cookie-handling).

```js
/* src/routes/route.js */
export const GET = ({ setHeaders }) => {
  setHeaders({
    'Powered-By': 'xink'
  })
}
```

## Cookie Handling

xink provides `event.cookies` inside of middleware and your route handlers, with methods `delete`, `get`, `getAll`, and `set`.

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

`event.locals` is available for you to define custom information per server request. This is an object where you can simply set the property and value, and then use it later in the request. This is often used in middleware, which then passes the values to routes.

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

## Validation

Validate incoming route data for `form`, `json`, `params`, or `query` parameters. Validated data is available as an object within `event.valid.[form | json | params | query]`.

To define validators, export a `validators` object from your route file. The first level of object properties define what HTTP handler the validation should apply to; this can include the `fallback` handler. Below that, you can define a function for `form`, `json`, `params`, and/or `query` validation.

Below, we are using a parse function from the Zod validation library, but you could also define a normal function for `json`, with your own validation logic, then return the validated data as an object. In the Zod example above, any data which does not match your schema is not passed to `event.valid`.

```js
/* src/routes/route.js */
import { z } from 'zod'

export const validators = {
  POST: {
    json: (z.object({
      hello: z.string(),
      goodbye: z.number()
    })).parse
  }
}

/**
 * Assuming the following json is passed in:
 * {
 *    hello: 'world',
 *    goodbye: 42,
 *    cya: 'later'
 * }
 * 
 */
export const POST = async (event) => {
  const received_json = event.valid.json // { hello: 'world', goodbye: 42 } }

  /* Do something and return a response. */
}
```

Below is a `valibot` example with types.

```js
import * as v from 'valibot'
import type { RequestEvent, Validators } from '@xinkjs/xink'

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.boolean()
})
type PostTypes = {
  json: v.InferInput<typeof post_json_schema>;
}

export const validators: Validators = {
  POST: {
    json: v.parser(post_json_schema)
  }
}

export const POST = async (event: RequestEvent<PostTypes>) => {
  const received_json = event.valid.json

  /* Do something and return a response. */
}
```

Be sure to look at the section below, to handle errors thrown by your validation library.

## Handling Errors

If you need to handle thrown errors separately, especially for errors from validation libraries, create an `error.[ts|js]` file in `src`, that exports a `handleError` function.

```ts
/* src/error.ts */
import { json } from "@xinkjs/xink"
import { ZodError } from "zod"

export const handleError = (e: any) => {
  if (e instanceof ZodError)
    return json({ data: null, error: e })
}
```

## Parameter Matchers

You can think of these as validators for route parameter segments (`params`). This feature came before validators; you don't need to use both for your params. However, one advantage of a matcher is that it can be defined once and used as much as you'd like.

You can validate route params by creating files in `src/params`. Each file in this directory needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruits.ts */
export const match = (param: string) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruit=fruits]/route.ts`, where the label on the right side of the `=` character should be the same as the filename (minus the extension) in `src/params`.

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

## Rest (Wildcard) Segments

Because of the way the xin URL router works, the rest segment's param is accessed with `'*'`.

```ts
/* src/routes/hello/[...rest]/route.js */
export const GET = ({ params }) => {
  return new Response(`Hello ${params['*']}!`) // not `params.rest`
}
```

## Import Aliases

- Use `$lib` for importing from `src/lib`, instead of having to deal with things like `../../utils.ts`. This requires extending your tsconfig.json file; see [doc](#tsconfig) for setup.
  ```js
  import { thing } from '$lib/utils.ts'
  ```

## Helper Functions

### html
Returns an html response. It sends a `Content-Length` header and a `Content-Type` header of `text/html`.
```js
import { html } from '@xinkjs/xink'

export const GET = (event) => { 
  return html(`<div>You chose ${event.params.fruit}</div>`)
}
```

### text
Returns a text response. By default, it sends a `Content-Length` header and a `Content-Type` header of `text/plain`.
```js
import { text } from '@xinkjs/xink'

export const GET = () => {
  return text(`Hello World!`)
}
```

### json
Returns a json response. By default, it sends a `Content-Length` header and a `Content-Type` header of `application/json`.
```js
import { json } from '@xinkjs/xink'

export const GET = () => {
  return json({ hello: 'world' })
}
```

### redirect
Returns a redirect response.
```js
import { redirect } from '@xinkjs/xink'

export const GET = () => {
  return redirect(status: number, location: string)
}
```

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)). If you don't want this, set `check_origin` to `false` in the xink plugin configuration.
- etag helper: returns 304 with no body, instead of 200 with body, if request etag equals response etag.

## Types

```ts
type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
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
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: Api.Locals,
  params: Params;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
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
  fallback?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
}
```

## Attributions
xink stands on the shoulders of giants. A special shoutout and tip of the hat goes to [SvelteKit](https://github.com/sveltejs/kit), as I used some of their code for various things; as it was not feasible to fork their code directly, and there's no reason to re-invent the wheel. Therefore, I've added a copyright for them in the license and marked relevant code with a short attribution.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
