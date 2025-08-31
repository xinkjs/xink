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
import * as v from "valibot"
import { Xin } from "@xinkjs/xin"

const api = new Xin()

const post_schema = {
  json: v.object({
    hello: v.string(),
    goodbye: v.number()
  })
}

/**
 * Assuming the following json is post'd:
 * {
 *    hello: 'world',
 *    goodbye: 42,
 *    cya: 'later'
 * }
 */
api.route("/")
  .post(post_schema, (event) => { 
    console.log(event.valid.json)
    // { hello: 'world', goodbye: 42 } }
    // "cya" doesn't exist on event.valid.json because it wasn't part of the schema

    // return a response
  })
```

## Types

To get intellisense for your data, you'll need to pass in their types to the method. We hope to have `ReqType` be automatic in a future version. Note that `ResType` only works for the `json()` helper method.

```js
import * as v from 'valibot'

const post_schema = {
  json: v.object({
    hello: v.string(),
    goodbye: v.number()
  })
}

type PostReqTypes = {
  json: v.InferInput<typeof post_schema.json>;
}
type PostResTypes = {
  message: PostReqTypes['json'];
}

api.route("/")
  .post<PostReqTypes, PostResTypes>(post_schema, (event) => { 
    // Intellisense for "hello" and "goodbye" for event.valid.json.
    const valid_json = event.valid.json

    event.json({}) // Intellisense that you should be returning `hello` as a string and `goodbye` as a number.
  })
```
