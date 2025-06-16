---
title: OpenAPI
---

xink makes it easy for you to create OpenAPI reference docs, powered by [Scalar](https://scalar.com/) to render them in a browser.

You can even let xink populate the docs automatically by using the [SCHEMAS](#using-standard-schema) hook to define your request schemas. Any additional information, like responses, still need to be defined in the `OPENAPI` export.

We merge data from the `OPENAPI` export (takes priority) with any data gathered from `SCHEMAS`.

## Endpoint configuration

First, define your `OPENAPI` export within each route file.

```js
/* src/routes/route.ts */
import * as v from 'valibot'
import { toJsonSchema } from "@valibot/to-json-schema"

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

/* Define route endpoints. */
...

/* Define SCHEMAS within the HOOKS export. */
export const HOOKS = {
  SCHEMAS: {
    post: {
      json: toJsonSchema(post_json_schema)
    }
  }
}

/* Define OpenAPI definitions. */
export const OPENAPI = {
  post: {
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
}
```

## OpenAPI configuration

Then, within your project's entrypoint file, define your desired path to the OpenAPI docs and any optional metadata. When the router is started, you can visit the reference docs in a browser - e.g. http://localhost:3000/reference

```ts
/* e.g. index.ts */
import { Xink } from "@xinkjs/xink"

const api = new Xink()

api.openapi({ 
  path: "/reference", 
  data: { 
    info: {
      title: "Xink API",
      version: "0.0.0"
    }
  }
})

export default api
```
