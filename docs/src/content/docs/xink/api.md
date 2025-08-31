---
title: API
---

### Xink class

```ts
import { Xink } from "@xinkjs/xink"

const api = new Xink()
```

You can pass a configuration object when creating the new instance.
```ts
{
  check_origin: boolean; // protect against CSRF attacks; default true
  base_path: string; // the router's base path for all created routes; default ''
}
```

### fetch

Handles a Request. You don't typically call this method directly, since a lot of runtimes automatically handle calling it.

```ts
// typical
import { Xink } from "@xinkjs/xink"

const api = new Xink()

export default api
```

```ts
// if needed
import { Xink } from "@xinkjs/xink"

const api = new Xink()

export default {
  fetch(request, env, ctx) {
    // do something
    
    return api.fetch(request, env, ctx)
  }
}
```
