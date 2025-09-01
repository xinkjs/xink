---
title: OpenAPI
---

xink makes it easy for you to create OpenAPI reference docs, powered by [Scalar](https://scalar.com/) to render them in a browser.

## OpenAPI configuration

Within your project's entrypoint file, define your desired path to the OpenAPI docs and any optional metadata. When the router is started, you can visit the reference docs in a browser - e.g. http://localhost:3000/reference

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

### Scalar options

xink uses Scalar to render OpenAPI docs, and you can pass Scalar options to the `openapi` method.

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

Define your `OPENAPI` export within each route file. You can use any OpenAPI spec within this object.

```js
/* src/routes/route.ts */
import * as v from "valibot"
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
      json: post_json_schema
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

### Tags

If you want to define `tags` for all of your OpenAPI HTTP method definitions, you can do the below. This value is merged with any defined "local" tags.

```ts
export const OPENAPI = {
  tags: ['User'], // set "global" tags for all HTTP handlers in this OpenAPI definition.
  post: {
    tags: ['Posts'],
    requestBody: {
      content: {
        "application/json": {
          schema: toJsonSchema(post_json_schema)
        }
      },
      required: true
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: post_schema
          }
        }
      }
    }
  },
  get: {
    tags: ['Gets'],
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: get_schema
          }
        }
      }
    }
  }
}
```
