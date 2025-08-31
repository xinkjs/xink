---
title: 'Not Found'
---

When needed, xink automatically returns a 404 Not Found response. To use a custom response, define a `handleNotFound` function in `src/error.ts`.

```ts
/* src/error.ts */
import type { RequestEvent } from '@xinkjs/xink'

export const handleNotFound = ({ html, url }: RequestEvent) => {
  return html(
    `<h1>Could not find path ${event.url.pathname}</h1>`
  )
}
```
