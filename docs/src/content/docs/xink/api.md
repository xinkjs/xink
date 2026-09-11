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
  allowed_origins: string[]; // additional trusted origins; default []
  base_path: string; // the router's base path for all created routes; default ''
  public_origin?: string; // external origin when running behind a proxy
  check_origin: boolean; // deprecated; use allowed_origins
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
