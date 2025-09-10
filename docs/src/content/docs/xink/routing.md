---
title: Routing
---

Create your routes in `src/routes`. xink is a directory-based router where endpoint files are named `route`. They can have a `.js`, `.ts`, `.jsx`, or `.tsx` extension.

```
src/
└── routes/
    ├── auth/
    │   └── route.ts  //creates an /auth route
    └── route.ts  //creates a / route
```

## HTTP exports

Within your `route` endpoint files, you define handler functions that are named after the HTTP methods they will serve.

xink supports the `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS` method.

You can also define a `default` handler. This acts as a fallback, and runs for any valid HTTP method you haven't defined. If no other handler functions are defined, this effectively becomes an "all" handler.

```js
/* src/routes/route.ts */

export const GET = () => {
  return 'Welcome to xink!'
}

/* handle any other supported http methods */
export default ({ request }) => {
  return { message: `Hello ${request.method}!` }
```

## Route Segment Types

Listed in order of match priority.

### Static

All route segments are statically defined.

`/hello/there/world`

### Specific

A combination of static and dynamic types.

`/hello/miss-[name]`

### Matcher

Dynamic segments (params) are validated. In the example, 'word' references a function which tests if the value of the `name` parameter matches.

`/hello/[name=word]`

xink comes with three built-in matcher functions, but you can override them or define your own in the `src/params` directory.

```js
/* word */
(param) => /^\w+$/.test(param)
```
```js
/* letter */
(param) => /^[a-z]+$/i.test(param)
```
```js
/* number */
(param) => /^\d+$/.test(param)
```

Each file in `src/params` needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruits.ts */
export const match = (param: string) => {
  return new Set(['apple', 'orange', 'grape']).has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruit=fruits]/route.ts`; where the label on the right side of the `=` character should be the same as the filename in `src/params` - minus the extension.

So, for the fruits example, if a request was made to `/apple`, it would match, but a request to `/banana` would not.

> Unlike schemas, matchers do not populate in `event.valid`

### Dynamic

Route segments can be params.

`/hello/[name]`

```ts
/* src/routes/hello/[name]/route.ts */

export const GET = ({ params }) => {
  return `Hello, ${params.name}!`
}
```

### Rest

Essentially a wildcard, but must be at the end of a route.

`/hello/[...rest]`

```ts
/* src/routes/hello/[...rest]/route.ts */

export const GET = ({ params }) => {
  return `Hello ${params.rest}!`
}
```
