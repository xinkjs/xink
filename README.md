# @xinkjs/xink

xink is a directory-based API router, and is a Vite plugin. The hope of a plugin is that it will enable developers to run xink in multiple runtimes.

- requires Vite v6, which is currently in beta.

## Road to Alpha

- [x] Bun
- [x] Deno
- [ ] Vitest tests

## Wishlist

- [ ] Support {Bun,Deno}.serve
- [x] Cloudflare runtime
- [ ] CORS
- [ ] CSRF origins
- [ ] Publish to JSR
- [ ] OpenAPI integration

## Route Types

xink uses the [xin](https://github.com/xinkjs/xin) URL router, which was forked from @medleyjs/router. However, since xink is designed for directory-based routing, we use brackets to define special route segments for parameters, etc.

xin's currently supported route types, in order of match priority:
- static: `/hello/there/world`
- specific: `/hello/miss-[name]`
- matcher: `/hello/[name=string]` (where 'string' references a function, which tests if the value of the `name` parameter matches)
- dynamic: `/hello/[name]`
- rest: `/hello/[...rest]` (essentially a wildcard, but must be at the end of a route)

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)).
- etag helper: returns 304 with no body, instead of 200 with body, if request etag equals response etag.

## Setup

Create a new project, then install Vite v6 and xink as dev dependencies. Also be sure to install your runtime.

```sh
npm install -D vite@beta @xinkjs/xink
```

### Vite plugin configuration

Create or ensure there is a "vite.config.js" file in your project's root directory.

For the xink plugin configuration:
- you must provide a `runtime` value
- `entrypoint` is optional, but should be the name of the server file in the root of your project. Below are the defaults for each supported runtime; so, you only need to set this if you're using something different.
  - Bun, `index.ts`
  - Cloudflare, `index.ts`
  - Deno, `main.ts`

```ts
type XinkConfig = {
  runtime: 'bun' | 'cloudflare' | 'deno';
  csrf?: { check?: boolean; origins?: string[]; } // not currently functional
  entrypoint?: string;
  middleware_dir?: string;
  build_dir?: string;
  params_dir?: string;
  routes_dir?: string;
}
```
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

## Use

In your project root, create your server's entrypoint file, e.g. `index.{js|ts}`, that uses the xink plugin.

> At this time, we are expecting a default export from this file, so you can't explicitly use `Bun.serve()` or `Deno.serve()`.

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

Routes should be created in `src/routes`, but this is configurable. Each folder under this path represents a route segment.

At the end of a route segment, a javascript or typescript `route` file should export one or more functions for each HTTP method it will serve. You can also define a `fallback`, for any unhandled request methods.

xink supports these verbs and function names: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'

```ts
/* src/routes/article/[slug]/route.ts */
import { json, text, type RequestEvent } from '@xinkjs/xink'

export const GET = async ({ params }: RequestEvent) => {
  const article = await getArticle(params.slug)

  return text(`Here is the ${article.title} post!`)
}

export const POST = async ({ req }: RequestEvent) => {
  return json(await req.json())
}

export const fallback = ({ req }: RequestEvent) => {
  return text(`Hello ${req.method}`)
}
```

## Cookie Handling

xink provides `event.cookies` inside of middleware and your route handlers, with methods `delete`, `get`, `getAll`, and `set`.

```ts
/* src/routes/route.ts */
export const GET = ({ cookies }: RequestEvent) => {
  cookies.set('xink', 'is awesome', { maxAge: 60 * 60 * 24 * 365 })
  const cookie_value = cookies.get('xink')
  const all_cookies = cookies.getAll()
  cookies.delete('xink')
}
```

## Locals

`event.locals` is available for you to define custom information per server request. This is an object where you can simply set the property and value.

This is often used in middleware, which then passes the values to routes.

```ts
/* src/middleware.ts */
export const handle: Handle = (event, resolve) => {
  event.locals.xink = "some value"

  return resolve(event)
}

/* src/routes/route.ts */
export const GET = (event) => {
  console.log(event.locals.xink) // "some value"
}
```

## Parameter Matchers

You can think of these as validators for dynamic (aka, parameter) route segments.

You can validate route params by creating files in `src/params`, again, configurable. The file needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruit.ts */
export const match = (param: string) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruits=fruit]`, where the right-side name should equal the filename (minus the extension) in `src/params`.

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

Because of the way the xin URL router works, params for rest segments are accessed with `'*'`.

```ts
/* src/routes/hello/[...rest]/route.ts */
import type { RequestEvent } from '@xinkjs/xink'

export const GET = ({ params }) => {
  return new Response(`Hello ${params['*']}!`) // not `params.rest`
}
```

## Helper Functions

### html
Returns an html response. It sends a `Content-Length` header and a `Content-Type` header of `text/html`.
```ts
import { html } from '@xinkjs/xink'

export const GET = (event) => { 
  return html(`<div>You chose ${event.params.fruits}</div>`)
}
```

### text
Returns a text response. By default, it sends a `Content-Length` header and a `Content-Type` header of `text/plain`.
```ts
import { text } from '@xinkjs/xink'

export const GET = () => {
  return text(`Hello World!`)
}
```

### json
Returns a json response. By default, it sends a `Content-Length` header and a `Content-Type` header of `application/json`.
```ts
import { json } from '@xinkjs/xink'

export const GET = () => {
  return json({ hello: world })
}
```

### redirect
Returns a redirect response.
```ts
import { redirect } from '@xinkjs/xink'

export const GET = () => {
  return redirect(status: number, location: string)
}
```

## Types

> `RequestEvent.route` is largely used internally, and not currently useful to developers.

```ts
type Cookies = {
  delete(name: string, options?: CookieSerializeOptions): void;
  get(name: string, options?: CookieParseOptions): string | undefined;
  getAll(options?: CookieParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: CookieSerializeOptions): void;
}
type Params = { [key: string]: string };
type Route = { store: Store; params: Params; } | null;

type RequestEvent = {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  route: Route;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
```

## Attributions
xink stands on the shoulders of giants. A special shoutout and tip of the hat goes to [SvelteKit](https://github.com/sveltejs/kit), as I used some of their code for various things but it was not feasible to fork their code directly. Therefore, I've added a copyright for them and marked relevant code with a short attribution.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
