---
title: Return Types
---

Beyond JSX, you can directly return `text`, `number`, or `json` content.

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
