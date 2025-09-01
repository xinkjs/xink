---
title: Quickstart
---

## Install and basic use

```bash
bun add @xinkjs/xi
```

## Start building your own API framework on top of xi

```ts
// cool-api-framework/index.ts
import { Xi, type BaseStore, type StoreConstructor } from "@xinkjs/xi"

class Store implements BaseStore {
  /* Define your store variables and methods. */

  // example usage
  handlers = new Map()

  // Since xi's `route` method returns your store
  // after registering a route, this is a great
  // place to define methods like `get()` so you
  // can chain them off of `route()`; but you don't
  // have to.
  get(handler) {
    this.handlers.set('GET', handler)
  }
}

export class Router extends Xi<Store> {
  // you must define this, named as-is, and return your store
  protected getStoreConstructor(): StoreConstructor<Store> {
    return Store
  }

  // fetch is the best method for handling requests,
  // as most runtimes look for this on a router.
  async fetch(request: Request) {
    const url = new URL(request.url)

    // lookup a route in xi and return your Store type
    const { store, params } = this.find(url.pathname)

    // handle request and return a response
  }
}
```

Then your users can do this:
```ts
import { Router } from "cool-api-framework"

const api = new Router()

// xi's route method, for registering a path; returns a store.
api.route("/")
  // chainable if you define methods in your Store
  .get(() => new Response("Hello world!"))

// many platforms support a default export that has a `fetch` method.
export default api
```
