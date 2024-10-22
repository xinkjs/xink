# @xinkjs/xin

An enhanced javascript URL router.

Like it's forked predecessor, xin is a building block on which you can create other router features. Its main purpose is to register and match routes. We've enhanced it by adding helper functions to extend the `matcher` route functionality and set/get global middleware.

> xin (zen) is a shortened spelling of our API router [xink](https://github.com/xinkjs/xink) (zinc). It also resembles [a Chinese word](https://en.wikipedia.org/wiki/Xin_(heart-mind)) that's translated as "heart-mind". This is fitting, since xin is the heart of the xink router.

## Install

```
bun add @xinkjs/xin
deno add npm:@xinkjs/xin
[p]npm add @xinkjs/xin
```

## QuickStart

```js
import { Router } from '@xinkjs/xin'

const router = new Router()

router.get('/', () => { /* ... */})
router.get('/user', () => { /* ... */})
router.post('/user', () => { /* ... */})
```

### Route conventions

- A path must start with a `/`.
- *parameters* - leading colon, e.g. `/blog/:slug`
- *matcher* - equals sign separator followed by a word label, e.g. `/user/:id=number`
- *wildcard* - trailing asterick, e.g. `/thing/*`

## API

### `new Router(options?)`

Constructs a new router instance.

- `options?` *object*
- Returns a *class* instance.

```js
import { Router } from '@xinkjs/xin'

const router = new Router()
```

#### Options

- `storeFactory?` *function* `() => Object.create(null)` - Used to create a route store when a route is registered. By default, returns `{}` with a null prototype (no access to methods like toString(), etc).

  ```js
  import { Router } from '@xinkjs/xin'

  const router = new Router({
    storeFactory() {
      return { handlers: new Map(), middlewares: [] }
    }
  })

  const store = router.register('/')
  console.log(store) // { handlers: Map {}, middlewares: [] }
  ```

### `router.[method](path, handler)`

Registers a route with the given HTTP method.

- `path` *string* - The route path.
- `handler` *function* - The route handler for the method.

xin supports these methods: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `fallback` - fallback being returned from a `router.find(path)` call for any method not defined for the route.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.get('/', () => new Response('Hello xin!'))
```

### `router.register(path)`

An alternative to `router.[method]()`.

Registers a route and returns it's store for further configuration. If the route has already been registered, it returns the existing route store. Use this method for full control over the store, which is typically used to store route handlers and other information.

- `path` *string* - The route path.
- Returns: *object* - The route store.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

const store = router.register('/user/:id')
console.log(store) // [Object: null prototype] {}
store['GET'] = () => new Response('Hello xin!')
```

#### Route and Segment Types

- *Static* - an exact match of the path.

  ```js
  '/'
  '/about'
  '/api/login'
  ```

- *Specific* - a mix of static content and a parameter.

  ```js
  '/v:version' // Matches '/v1'
  '/on-:event'     // Matches '/on-click'
  ```

- *Matcher* -  applies a matcher function to the parameter.

  These segments reference a function which the parameter is tested against. So, you can think of the function as a validator for the parameter. For the purpose of the example below, the matcher function tests against a regular expression of `/^\d+$/`, so it has to be a number.

  ```js
  '/api/user/:id=number' // Matches  '/api/user/42
  '/api/v:version=number' // Matches '/api/v1', but not '/api/vONE'
  ```

  xin provides three built-in matcher functions:

  - letter `(param) => /^[a-z]+$/i.test(param)`
  - number `(param) => /^\d+$/.test(param)`
  - word `(param) => /^\w+$/.test(param)`

  > You can override the built-in matchers, or create your own, by registering them with [setMatcher()](#routersetmatcher).

- *Dynamic* - a segment that begins with a `:`, and will match anything up to the next `/` or to the end of the path. The text within these bounds defines the name of the parameter.

  ```js
  '/user/:id' // Matches /user/42
  '/user/:id/post' // Matches /user/42/post
  '/user/:userId/post/:postId' // Matches /user/42/post/1
  ```

  ```js
  import { Router } from '@xinkjs/xin'
  const router = new Router()

  router.get('/user/:id', () => {})

  const route = router.find('/user/42')
  console.log(route.params) // { id: '42' }
  ```

  If multiple routes have a parameter in the same part of the route, the
  parameter names must be the same. For example, registering the following two
  routes would be an error because the `:id` and `:userId` parameters conflict
  with each other:

  ```js
  '/user/:id'
  '/user/:userId/post'
  ```

- *Wildcard* - path ends with a `*`. This will match any characters in the rest of the path, including `/` characters or no characters. The wildcard value will be set in the route `params` object with `'*'` as the key.

  For example, the following route:

  ```js
  '/static/*'
  ```

  will match all of these URLs:

  ```
  /static/
  /static/favicon.ico
  /static/js/main.js
  /static/css/vendor/bootstrap.css
  ```

  ```js
  import { Router } from '@xinkjs/xin'
  const router = new Router()

  router.get('/static/*', () => {})

  let route = router.find('/static/favicon.ico')
  console.log(route.params) // { '*': 'favicon.ico' }

  route = router.find('/static/')
  console.log(route.params) // { '*': '' }
  ```

### `router.find(path)`

Attempts to find a route.

- `path` *string* - The route path to be matched.
- Returns *{ store, params }* | *null*

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.get('/', () => {})
router.get('/user', () => {})
router.post('/user', () => {})
router.get('/user/:id', () => {})
router.get('/static/*', () => {})

router.find('/')
// {
//   store: { GET: [Function] },
//   params: {}
// }

router.find('/user')
// {
//   store: { GET: [Function], POST: [Function] },
//   params: {}
// }

router.find('/user/42')
// {
//   store: { GET: [Function] },
//   params: { id: '42'}
// }

router.find('/static/js/common.js')
// {
//   store: { GET: [Function] },
//   params: { '*': 'js/common.js' }
// }

router.find('/not-defined')
// null
```

#### Path Match Order

The matching order goes from more specific to less specific.

1. Static
2. Specific
3. Matcher
4. Dynamic
5. Wildcard

For example, an incoming path of "/static/v2" will be matched in the below order; where the regex for the "word" matcher is `/^\w+$/`.

```js
'/static/v2'  //static
'/static/v:number'  //specific: because the "v" makes it partially static
'/static/:version=word'  //matcher: aka dynamic with a validator, so it is more specific than dynamic
'/static/:version'  //dynamic
'/static/*'  //wildcard
```

### `router.getTree()`

Returns the entire route tree.

- Returns: _Node_ - The router's root node.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

const tree = router.getTree()
```

### `router.setMatcher(type, matcher)`

Sets a matcher, to be used with matcher route types.

- `type` *string* - The name of the matcher.
- `matcher` *(param: string) => boolean* - The function which is used to test params against. 

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.setMatcher('fruit', (param) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
})
```

### `router.getMatcher()`

Returns a specific matcher function.

- Returns: *Matcher* | *null*

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

const matcher = router.getMatcher('word')
```

### `router.setMiddleware(function)`

Sets the global middleware function. This must be a single function, but in theory it could handle multiple functions itself.

- function *() => Promise\<Response\> | Response* - A global middleware function that runs on every request.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.setMiddleware((req) => {
  return new Response('Hello, from middleware')
})
```

### `router.getMiddleware()`

Returns the middleware function.

- Returns: *() => Promise\<Response\> | Response*
