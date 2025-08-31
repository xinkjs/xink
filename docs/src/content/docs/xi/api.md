---
title: API
---

### Xi class

You can pass an object of configuration options when creating the new instance.
```ts
{
  base_path: string; // the router's base path for all created routes
}
```

```ts
import { Xi, type BaseStore, type StoreConstructor } from "@xinkjs/xi"

class Store {
  /* Define your store variables and methods. */
}

export declare class Router extends Xi<Store> {
  // you must define this, named as-is, and return your store
  protected getStoreConstructor(): StoreConstructor<Store> {
    return Store
  }

  // support users passing the config to your router
  constructor(options) {
    // perhaps some options would be saved in your router's config

    super(options) // then pass config to Xi
    // alternatively, you can be specific
    // super({ base_path: options.base_path })
  }
}
```

#### **route**

Register a route.

```js
const store = this.route('/user')
```

Parameters:
  - `path` (`string`): The URL path to register. Must start with a `/`.

Returns: The route's store.

Throws:
  - `Error` if `path` does not start with a `/`.

#### **find**

Find a route.

```js
const { store, params } = this.find('/user')
```

Parameters:
  - `path` (`string`): The URL path to find. Must start with a `/`.

Returns an object of:
  - `store` (`Store|null`): The route's store.
  - `params` (`Params`): An object of `Record<string, any>`, or `{}` if there are none.

Throws:
  - `Error` if `path` does not start with a `/`.

#### **getConfig**

Get the router's configuration.

```js
const config = this.getConfig() // use `super.getConfig()` if you have your own method.
```

Returns: `{ base_path: string }`.

#### **matcher**

Register a custom matcher function.

```ts
xi.matcher(
  'fruit', 
  (param: string): boolean => new Set['apple','banana','orange'].has(param)
)
```
