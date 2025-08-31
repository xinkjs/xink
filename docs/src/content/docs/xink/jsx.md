---
title: JSX
---

> `compilerOptions` are already included if you used `xk` to create your project.

If you're using Deno, add this to your `deno.json` file:
```json
"compilerOptions": {
  "jsx": "react-jsx",
  "jsxImportSource": "@xinkjs/xink"
}
```

Otherwise, add to your `tsconfig.json` file:
```json
"compilerOptions": {
  "jsx": "react-jsx",
  "jsxImportSource": "@xinkjs/xink"
}
```

Be sure to use a `.jsx` or `.tsx` file extension with your route filename.
```js
/* src/routes/route.tsx */
export const GET = () => {
  return (
    <h1>Welcome to xink!</h1>
  )
}
```
