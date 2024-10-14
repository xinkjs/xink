# @xinkjs/xin

An enhanced javascript URL router.

> xin (zen) is a shortened spelling of our API router [xink](https://github.com/xinkjs/xink). It also resembles [a Chinese word](https://en.wikipedia.org/wiki/Xin_(heart-mind)) that's translated as "heart-mind". This is fitting, since xin is the heart of the xink router.

### Features

- Route types from @medleyjs/router:
  - static: /hello/there/world
  - specific: /hello/miss-:name
  - dynamic: /hello/:name
  - wildcard: /hello/*
- Route types added by xin:
  - matcher: /hello/:name=string (where 'string' references a function, which tests if the value of the `name` parameter matches)

> An optional route - e.g. :lang? - feature is planned. We may also consider allowing a wildcrad to be in the middle of a route. Contributions welcome!

## Install

```sh
npm install @xinkjs/xin
```

## API

### `new Router(options)`

Constructs a new router instance.

- `options` (*object*) - Optional object that may have any of the following options:
  - `storeFactory` (*function*) - Used to create a route store when a route is registered. Default is `() => Object.create(null)`.

```js
import { Router } from '@xinkjs/xin'

const router = new Router()
```

#### Options
Use the `storeFactory` option to customize the route store.

```js
import { Router } from '@xinkjs/xin'

const router = new Router({
  storeFactory() {
    return { handlers: new Map(), middlewares: [] }
  }
});

const store = router.register('/')
console.log(store) // { handlers: Map {}, middlewares: [] }
```

### `router.register(path)`

Registers a route and returns the route store object. If the route has already been registered, it just returns the route store.

- `path` (*string*) - The route path.
- Returns: *object* - The route store.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

const store = router.register('/users/:id')
console.log(store) // [Object: null prototype] {}
```

HTTP example:

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

function addRoute(method, path, handler) {
  const store = router.register(path)
  store[method] = handler
}

addRoute('GET', '/', () => { /* ... */})
addRoute('GET', '/users', () => { /* ... */})
addRoute('POST', '/users', () => { /* ... */})
```

#### Route Types

##### 1. Static

Static routes match exactly the path provided.

```
/
/about
/api/login
```

##### 2. Specific

Parameters may start anywhere in the path. For example, the following are valid routes:

```js
'/api/v:version' // Matches '/api/v1'
'/on-:event'     // Matches '/on-click'
```

##### 3. Matcher

These routes reference a function which the parameter is tested against. So, you can think of the  function as a validator for the parameter. For the purpose of the example, the matcher function tests against a regular expression of `/^[0-9]+$/`, so it has to be a number.

```js
'/api/v:version=number' // Matches '/api/v1', but not '/api/vONE'
```

xin provides three built-in matcher functions.

1. letter `(param) => /^[a-z]+$/i.test(param)`
2. number `(param) => /^[0-9]+$/.test(param)`
3. string `(param) => /^[a-z0-9]+$/i.test(param)`

You can override the built-in matchers, or create your own, by registering them with [setMatcher()](#routersetmatcher). The matcher function has to return a `boolean`.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.setMatcher('fruit', (param) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
})
```

##### 4. Dynamic

Path segments that begin with a `:` denote a parameter and will match anything
up to the next `/` or to the end of the path.

```
/users/:userID
/users/:userID/posts
/users/:userID/posts/:postID
```

Everything after the `:` character will be the name of the parameter in the
route `params` object.

```js
router.register('/users/:userID')

const route = router.find('/users/100')
console.log(route.params) // { userID: '100' }
```

If multiple routes have a parameter in the same part of the route, the
parameter names must be the same. For example, registering the following two
routes would be an error because the `:id` and `:userID` parameters conflict
with each other:

```
/users/:id
/users/:userID/posts
```

##### 5. Wildcard

Routes that end with a `*` are wildcard routes. The `*` will match any
characters in the rest of the path, including `/` characters or no characters.

For example, the following route:

```
/static/*
```

will match all of these URLs:

```
/static/
/static/favicon.ico
/static/js/main.js
/static/css/vendor/bootstrap.css
```

The wildcard value will be set in the route `params` object with `'*'` as the key.

```js
router.register('/static/*')

let route = router.find('/static/favicon.ico')
console.log(route.params) // { '*': 'favicon.ico' }

route = router.find('/static/')
console.log(route.params) // { '*': '' }
```

### `router.find(path)`

Finds a route that matches the provided path. Returns `null` if no route matches the path.

- `path` (*string*) - The route path to be matched.
- Returns: *{store: object, params: object}* | *null* - The route store and matching parameters; or `null` if the path did not match any registered routes.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

function addRoute(method, path, handler) {
  const store = router.register(path)
  store[method] = handler
}

addRoute('GET', '/', () => {})
addRoute('GET', '/users', () => {})
addRoute('POST', '/users', () => {})
addRoute('GET', '/users/:id', () => {})
addRoute('GET', '/static/*', () => {})

router.find('/')
// {
//   store: { GET: [Function] },
//   params: {}
// }

router.find('/users')
// {
//   store: { GET: [Function], POST: [Function] },
//   params: {}
// }

router.find('/users/100')
// {
//   store: { GET: [Function] },
//   params: { id: '100'}
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

For example, an incoming path of "/static/v2" will be matched in the below order; where the regex for the "string" matcher is /[a-z0-9]/

```sh
/static/v2  //static
/static/v:number  //specific: because the "v" makes it partially static
/static/:verison=string  //matcher: aka dynamic with a validator, so it is more specific than dynamic
/static/:version  //dynamic
/static/*  //wildcard
```

Another example would be that "/static/TWO" would match the dynamic route. It's not a "string" in this case, since uppercase letters are not allowed in the regex.

It's also worth noting that the wildcard route would never match any two-segment path that starts with "/static/", because either the matcher or dynamic route will match them first; especially since the dynamic route will accept anything as the second path segment.

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

- `type` _(string)_ - The name of the matcher.
- Returns: _void_

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

- Returns: _Matcher_ | _null_ - The matcher function, if it exists. 

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

const matcher = router.getMatcher('string')
```

### `router.setMiddleware(function)`

Sets the middleware function. This must be a singular function, but in theory it could handle multiple functions itself.

- function _((): Promise<any> | any | void)_ - A middleware function that runs on every request.

```js
import { Router } from '@xinkjs/xin'
const router = new Router()

router.setMiddleware((req) => {
  return new Response()
})
```

### `router.getMiddleware()`

Returns the middleware function.

- Returns: _(): Promise<any> | any | void_ - The middleware function.
