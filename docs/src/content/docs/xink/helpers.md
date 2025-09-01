---
title: Helpers
---

All helper functions are available within `event` but can also be top-level imported from `@xinkjs/xink`.

## redirect
Returns a redirect response.
```ts
export const GET = (event) => {
  return event.redirect(307, '/login')
}
```

## html
Returns an html response. It sends a `Content-Length` header, and a `Content-Type` header of `text/html`.
```js
export const GET = (event) => { 
  return event.html(`<div>You chose ${event.params.fruit}</div>`)
}
```

## text
Returns a text response. By default, it sends a `Content-Length` header, and a `Content-Type` header of `text/plain`.
```js
export const GET = (event) => {
  return event.text(`Hello World!`)
}
```

## json
Returns a json response. By default, it sends a `Content-Length` header, and a `Content-Type` header of `application/json`.
```js
export const GET = (event) => {
  return event.json({ hello: 'world' })
}
```
