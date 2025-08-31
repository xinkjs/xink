---
title: JSX
---

If you're using Deno, add this to your `deno.json` file:
```json
"compilerOptions": {
  "jsx": "react-jsx",
  "jsxImportSource": "@xinkjs/xin"
}
```

Otherwise, add to your `tsconfig.json` file:
```json
"compilerOptions": {
  "jsx": "react-jsx",
  "jsxImportSource": "@xinkjs/xin"
}
```

Be sure to use a `.jsx` or `.tsx` file extension with your route filename.
```js
/* route.tsx */
api.get(() => 
  return (
    <h1>Welcome to xin!</h1>
  )
)
```
