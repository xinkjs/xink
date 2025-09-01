---
title: Routes
---

> Everything on this page is inherited from xi

Route paths must start with a `/` or an error will be thrown.

## Types

> You can also refer to these as segment types.

- *static* - `/hello`, exact match
- *param* - `/:slug`, leading colon followed by a word label
- *matcher* - `/:id=number`, a param followed by an equals sign and then a word label (which must reference a function)
- *wildcard* - `/*rest`, leading asterick followed by a word label

## Examples

### *Static*
An exact match.

```js
'/'
'/api'
'/auth/login'
```

### *Specific*
A mix of static content and a param.

```js
'/v:version' // Matches '/v1'
'/on-:event'     // Matches '/on-click'
```

### *Matcher*
Test a param against a function. Think of the function as a validator for the param.

For the example below, the `number` matcher function tests against a regular expression of `/^\d+$/` - so it has to be a number.

```js
'/api/user/:id=number' // Matches  '/api/user/42
'/api/v:version=number' // Matches '/api/v1', but not '/api/vONE'
```

xi provides three built-in matcher functions:

- letter `(param) => /^[a-z]+$/i.test(param)` (case insensitive)
- number `(param) => /^\d+$/.test(param)`
- word `(param) => /^\w+$/.test(param)` (Equivalent character class - `/^[a-zA-Z0-9_]$/`)

### *Dynamic*
A segment that begins with a `:`, and will match anything up to the next `/` or to the end of the path. The text within these bounds defines the name of the parameter.

```js
'/user/:id' // Matches /user/42
'/user/:id/post' // Matches /user/42/post
'/user/:userId/post/:postId' // Matches /user/42/post/1
```

If multiple routes have a param in the same part of the route, the
param names must be the same. For example, registering the following two
routes would be an error because the `:id` and `:userId` params conflict
with each other:

```js
'/user/:id'
'/user/:userId/post'
```

### *Wildcard*
Path ends with a `*`, followed by a param name. This will match any characters in the rest of the path, including `/` characters or no characters. The wildcard value will be set in the `params` object with the param name as the key.

For example, the following route:

```js
'/static/*rest'
```

will match all of these URLs:

```js
'/static/thing' // param 'rest' is '/thing'
'/static/favicon.ico' // param 'rest' is '/favicon.ico'
'/static/js/main.js' // param 'rest' is '/js/main.js'
'/static/css/vendor/bootstrap.css' // param 'rest' is '/css/vendor/bootstrap.css'
```
