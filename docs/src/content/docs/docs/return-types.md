---
title: Return Types
---

Beyond JSX, you can directly return `text`, `number`, or `json` content.

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
