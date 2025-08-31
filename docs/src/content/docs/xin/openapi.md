---
title: OpenAPI
---

xin makes it easy for you to create OpenAPI reference docs, powered by [Scalar](https://scalar.com/) to render them in a browser.

## OpenAPI configuration

Within your project's entrypoint file, define your desired path to the OpenAPI docs and any optional metadata. When the router is started, you can visit the reference docs in a browser - e.g. http://localhost:3000/reference

```ts
/* e.g. index.ts */
import { Xin } from "@xinkjs/xin"

const api = new Xin()

api.openapi({ 
  path: "/reference", 
  data: { 
    info: {
      title: "My API",
      version: "0.0.0"
    }
  }
})

export default api
```

### Scalar options

xin uses Scalar to render OpenAPI docs, and you can pass Scalar options to the `openapi` method.

```ts
api.openapi({
  scalar: {
    theme: 'kepler'
  }, 
  path: "/reference", 
  data: { 
    info: {
      title: "My API",
      version: "0.0.0"
    }
  }
})
```

## Endpoint configuration

Pass OpenAPI spec, for the entire route, as the second argument to `.route()`.

```js
/* index.ts */
import * as v from "valibot"
import { toJsonSchema } from "@valibot/to-json-schema"
import { Xin } from "@xinkjs/xin"

const api = new Xin()

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.string()
})

const post_res_schema = v.object({
  data: v.nullable(v.object({
    message: v.string()
  })),
  error: v.nullable(v.unknown())
})

api.route("/", {
  tags: ['Root'], // set "global" tags for all HTTP handlers in this route
  post: {
    tags: ['Posts'], // handler-specific tags
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: toJsonSchema(post_res_schema)
          }
        }
      }
    }
  }
}).post(post_json_schema, () => { /* ... */ })
```
