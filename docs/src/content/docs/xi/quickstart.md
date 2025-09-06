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

  // example variable
  handlers = new Map()

  // possible class methods to support features
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

  // other class methods to support features
}
```

Then your users can do this:
```ts
import { Router } from "cool-api-framework"

const api = new Router()

// do cool api stuff

// many platforms support a default export that has a `fetch` method.
export default api
```
