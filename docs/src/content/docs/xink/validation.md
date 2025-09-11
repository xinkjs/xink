---
title: Validation
---

Validate incoming route data for types `form`, `json`, route `params`, or `query` search params.

- Each of the above are available as an object within `event.valid`. 
- Run before all other hooks; so, validated data is available in your developer-defined hooks.
- Requires a Standard Schema validation library.

Any "string" values within `form`, `params`, and `query`, are automatically inferred to their intended type. For example:
- "42" -> 42 (number)
- "false" -> false (boolean)
- "null" -> null (null)

## Standard Schema

`SCHEMAS` is a built-in `HOOKS` object. For each route handler and data type, you can define a schema to validate data. You can only use SCHEMAS when using a validation library that is [Standard Schema](https://standardschema.dev) compliant.

```js
/* src/routes/route.js */
import * as v from 'valibot'

const SCHEMAS = {
  post: {
    json: v.object({
      hello: v.string(),
      goodbye: v.number()
    })
  }
}

export const HOOKS = {
  SCHEMAS
}

/**
 * Assuming the following json is passed in:
 * {
 *    hello: 'world',
 *    goodbye: 42,
 *    cya: 'later'
 * }
 */
export const POST = async (event) => {
  console.log(event.valid.json)
  // { hello: 'world', goodbye: 42 } }

  /* Do something and return a response. */
}
```

## Types

Pass your Request and Response types to get type checking and intellisense in your endpoint handlers.

```js
import * as v from 'valibot'
import type { Handler } from '@xinkjs/xink'

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.number()
})
type PostReqTypes = {
  json: v.InferInput<typeof post_json_schema>;
}
type PostResTypes = {
  message: PostReqTypes['json'];
}

const SCHEMAS = {
  post: {
    json: v.parser(post_json_schema)
  }
}

export const HOOKS = {
  SCHEMAS
}

export const POST: Handler<PostReqTypes, PostResTypes> = async (event) => {
  // IDE autocomplete/types for "hello" and "goodbye" for event.valid.json.
  const valid_json = event.valid.json

  if (valid_json)
    return event.json({ message: event.valid.json }) // type checking
  else
    return { message: 'Error' } // no type checking here, because we're not using event.json
}
```
