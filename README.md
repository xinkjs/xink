# @xinkjs/xink

A Vite plugin for the xink API router; in early development, so expect changes. The hope of a plugin is that it will enable developers to run xink in multiple runtimes.

## Road to Alpha

- [x] `dev` working with Bun.
- [ ] `build` working with Bun.
- [ ] `dev` working with Deno.
- [ ] `build` working with Deno.
- [ ] `dev` working with Node.
- [ ] `build` working with Node.

## Route Types

xink uses the [xin](https://github.com/xinkjs/xin) URL router, which was forked from @medleyjs/router. However, since xink is designed for file-based routing, for compatibility, we use brackets to define special route segments for parameters, etc.

xin's currently supported route types, in order of match priority:
- static: `/hello/there/world`
- specific: `/hello/miss-[name]`
- dynamic: `/hello/[name]`
- rest: `/hello/[...rest]`
- matcher: `/hello/[name=string]` (where 'string' references a function, which tests if the value of the `name` parameter matches)

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)).
- etag helper: returns 304 with no body, instead of 200 with body, if request etag equals response etag.

## Setup

Create a new project, then install Vite v6 and xink as dev dependencies. Also be sure to install your runtime.

> xink uses Vite v6, which is currently in beta.

```sh
npm install -D vite@beta @xinkjs/xink
```

### Vite plugin configuration

Create or ensure there is a "vite.config.js" file in your project's root directory.

For the xink plugin configuration, you must pass in a value for `runtime`, so we know how to handle things correctly; and there is currently no default for it.

```ts
/* vite.config.js */

import { xink } from '@xink-sh/xink'
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
  runtime: 'node' | 'bun' | 'deno';
  csrf?: { check?: boolean; origins?: string[]; } // not currently functional
  middleware?: string;
  outdir?: string;
  params?: string;
  routes?: string;
}
```

## Create Routes

By default, routes should be created in `src/routes`. Each folder under this path represents a route segment.

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

xink provides `event.cookies` inside of your route handlers, with methods `delete`, `get`, `getAll`, and `set`.

```ts
/* src/routes/route.ts */
export const GET = ({ cookies }: RequestEvent) => {
  cookies.set('xink', 'is awesome', { maxAge: 60 * 60 * 24 * 365 })
  const cookie_value = cookies.get('xink')
  const all_cookies = cookies.getAll()
  cookies.delete('xink')
}
```

## Use

In your project root, create an `index.{js|ts}` file that uses the xink plugin.

> At this time, we are expecting a default export from this file, so you can't explicitly use `Bun.serve()` or `Deno.serve()`.

```ts
/* index.ts */
import { xink } from '@xinkjs/xink'

const api = new xink()
await api.init()

export default {
  fetch(req: Request) {
    return api.fetch(req)
  }
}
```

## Parameter Matchers

You can think of these as validators for dynamic (aka, parameter) route segments.

You can validate route params by creating files in `src/params`. The file needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruit.ts */
export const match = (param: string) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruits=fruit]`, where the right-side name should equal the filename (minus the extension) in `src/params`.

xink provides the following built-in matchers, but they can be overridden by creating your own file definitions:

```js
/* string */
(param) => /^[a-z0-9]+$/i.test(param)
```
```js
/* letter */
(param) => /^[a-z]+$/i.test(param)
```
```js
/* number */
(param) => /^[0-9]+$/.test(param)
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
