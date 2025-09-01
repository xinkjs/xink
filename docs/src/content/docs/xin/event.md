---
title: Event
---

`event` is basically a context object for the request.

```ts
interface RequestEvent<ReqT extends SchemaDefinition = SchemaDefinition, ResT = any, Platform extends PlatformContext = PlatformContext> extends BaseEvent {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: (data: any, init?: ResponseInit | undefined): Response; // return an html response
  json: (data: ResT, init?: ResponseInit): Response; // return a json response
  locals: Api.Locals;
  params: Record<string, string | undefined>;
  platform: Platform;
  redirect: (status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, location: string): never; // redirect the request
  request: Request;
  setHeaders: (headers: Record<string, any>): void;
  store: Store | null;
  text: (data: string, init?: ResponseInit | undefined): Response; // return a text response
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: ReqT; // validated data via Standard Schema
}
```

## Cookie Handling

Use `event.cookies` to `delete`, `get`, `getAll`, and `set` cookies.

```js
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.route("/")
  .get(({ cookies }) => {
    // name, value, options
    cookies.set("xin", "is awesome", { maxAge: 60 * 60 * 24 * 365 })

    const cookie_value = cookies.get("xin")
    const all_cookies = cookies.getAll()
    cookies.delete("xin")

    return new Response("Hello from xin")
  })
```

## Locals

`event.locals` is available for you to define custom information per request. This is good for use with middleware or hooks.

```ts
/* middleware/fn1.ts */
export const middlewareFn1: Handle = (event, resolve) => {
  event.locals.xin = "is awesome"

  return resolve(event)
}

/* index.ts */
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.route("/")
  .get((event) => {
    console.log(event.locals.xin) // is awesome
  })

export default api
```

To type your locals, create an `api.d.ts` file in the root of your project.
```ts
declare global {
  namespace Api {
    interface Locals {
      xin: string;
    }
  }
}

export {}
```

## Setting Headers

Use `event.setHeaders` to set response headers. These will be added right before xin returns the response. So, if set within a handler, your middleware will not see these.

> You cannot set cookies using this method; instead, use [`event.cookies`](#cookie-handling).

```ts
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.route("/")
  .get((event) => {
    event.setHeaders({
      "Powered-By": "xin"
    })

    const response = new Response("Hey") // you will not see the headers here

    return response
  )

export default api
```
