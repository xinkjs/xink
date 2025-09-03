---
title: Return Types
---

Handlers in Xink can return several different types of values. These are automatically normalized into proper HTTP responses.

- **JSX** → rendered to HTML (`text/html`)
- **string / number** → returned as `text/plain`
- **object** → returned as `application/json`
- **Response** → passed through as‑is
- **null / undefined** → `204 No Content`

## JSX
Returns an HTML response.

```tsx
export const GET = (() => {
  return <h1>Hello from JSX!</h1>
})
```

## Text and Numbers
Returns a text/plain response. Numbers are converted to strings.
```js
export const GET = () => 'Ok'
```
```js
export const GET = () => 42
```

## JSON
Returns an application/json response.
```js
export const GET = () => {
  return {
    "message": "Welcome to xink!"
  }
}
```

## Response
You can also return a raw `Response` if you need full control.

```js
export const GET = (() => {
  return new Response("Custom", { status: 202 })
})
```

## No Content
Returning `null` or `undefined` results in a `204 No Content` response.

```js
export const GET = (() => null)
```

