---
title: Return Types
---

Handlers in Xin can return several different types of values. These are automatically normalized into proper HTTP responses.

- **JSX** → rendered to HTML (`text/html`)
- **string / number** → returned as `text/plain`
- **object** → returned as `application/json`
- **Response** → passed through as‑is
- **null / undefined** → `204 No Content`

## JSX
Returns an HTML response.

```tsx
api.get(() => {
  return <h1>Hello from JSX!</h1>
})
```

## Text and Numbers
Returns a text/plain response. Numbers are converted to strings.
```js
api.get(() => 'Ok')
```
```js
api.get(() => 42)
```

## JSON
Returns an application/json response.
```js
api.get(() => {
  return {
    "message": "Hello World!"
  }
})
```

## Response
You can also return a raw `Response` if you need full control.

```js
api.get(() => {
  return new Response("Custom", { status: 202 })
})
```

## No Content
Returning `null` or `undefined` results in a `204 No Content` response.

```js
api.get(() => null)
```
