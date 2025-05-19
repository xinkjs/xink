---
title: Validation
---

Validate incoming route data for types `form`, `json`, route `params`, or `query` search params.

- Each of the above are available as an object within `event.valid`. 
- Run before all other hooks; so, validated data is available in your developer-defined hooks.
- You can validate using either validator functions or Standard Schema.

Any "string" values within `form`, `params`, and `query`, are automatically inferred to their intended type. For example:
- "42" -> 42 (number)
- "false" -> false (boolean)
- "null" -> null (null)

## Using Validators

`VALIDATORS` is a built-in `HOOKS` object. For each route handler and data type, you can define a function that returns an object of validated data. 

In the Zod example below, only json data which matches your schema, will be available in `event.valid.json`; in this case, for POST requests.

```js
/* src/routes/route.js */
import { z } from 'zod'

const VALIDATORS = {
  post: {
    json: (z.object({
      hello: z.string(),
      goodbye: z.number()
    })).parse // notice we pass a parse function, not just the schema.
  }
}

export const HOOKS = {
  VALIDATORS
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

Instead of using a validation library, you can also define a normal function with your own validation logic, then return the validated data as an object.

> We clone the request during validation. This allows you to access the original request body within route handlers, if desired.

## Using Standard Schema

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

Pass your types to `RequestEvent` to get checking and intellisense in your endpoint handlers.

```js
import * as v from 'valibot'
import type { RequestEvent, Validators } from '@xinkjs/xink'

const post_json_schema = v.object({
  hello: v.string(),
  goodbye: v.number()
})
type PostTypes = {
  json: v.InferInput<typeof post_json_schema>;
}

const VALIDATORS: Validators = {
  post: {
    json: v.parser(post_json_schema)
  }
}

export const HOOKS = {
  VALIDATORS
}

export const POST = async (event: RequestEvent<PostTypes>) => {
  // IDE autocomplete/types for "hello" and "goodbye" for event.valid.json.
  const valid_json = event.valid.json

  /* Do something and return a response. */
}
```
