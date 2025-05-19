---
title: Event
---

`event` is basically a context object for the request.

```ts
interface RequestEvent<V extends AllowedValidatorTypes = AllowedValidatorTypes> {
  cookies: Cookies;
  ctx: Context; // Cloudflare
  env: Env.Bindings; // Cloudflare
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
```

## Cookie Handling

Use `event.cookies` to `delete`, `get`, `getAll`, and `set` cookies.

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

`event.locals` is available for you to define custom information per request.

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

To type your locals, create a `src/api.d.ts` file.
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

## Setting Headers

Use `event.setHeaders` to, well, set headers.

> You cannot set cookies using this method; instead, use [`event.cookies`](#cookie-handling).

```js
/* src/routes/route.js */
export const GET = ({ setHeaders }) => {
  setHeaders({
    'Powered-By': 'xink'
  })
}
```
