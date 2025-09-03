---
title: 'Errors'
---

To handle thrown errors in your API, especially errors from validation libraries, define a `handleError` function in `src/error.ts`.

```ts
/* src/error.ts */
import { json, StandardSchemaError } from "@xinkjs/xink"

export const handleError = (e: any) => {
  if (e instanceof StandardSchemaError)
    return json({ 
      data: null, 
      error: JSON.parse(e.message) // use JSON.parse to return as an array
    })

  /* Handle other errors. */
  return json({ 
    data: null, 
    error: e.message 
  })
}
```
