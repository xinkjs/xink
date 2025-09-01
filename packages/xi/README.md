# xi

A javascript trie router. Pronounced "z".

xi is designed to do three things:
- register routes
- store route information
- find routes and return their information

xi alone is not designed to handle a `Request` and `Response`, but you can build a higher-level router on top of it for those purposes.

> Hooks and middleware are different things, according to xi. Hooks are functions that have access to the `Request`. xi stores hooks because they are tightly coupled to route endpoints. In contrast, middleware are functions that have access to the `Request` and the `Response`. Middleware, by default, has no tight coupling with registered routes, but rather `Request`s, `Response`s, and paths. Therefore, xi has no middleware functionality; this should be handled by a higher-level router.

## Install

```
bun add @xinkjs/xi
deno add npm:@xinkjs/xi
[p]npm add @xinkjs/xi
```

## QuickStart

```js
import { Router } from '@xinkjs/xi'

const router = new Router()

// Register the /user route, and use chaining to set method handlers
router.route('/user')
  .get(() => new Response('Hello GET, from /user'))
  .post(() => new Response('Hello POST, from /user'))
```

## Route conventions

- When registering a route, the path must start with a `/`
- *param* - `/blog/:slug`, leading colon followed by a word label
- *matcher* - `/user/:id=number`, after a param, equals sign followed by a word label
- *wildcard* - `/thing/*rest`, leading asterick followed by a word label

## Segment Types

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
Test a param against a function. So, you can think of the function as a validator for the param.

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

## API

### Router class

```ts
import { Router } from "@xinkjs/xi"

const router = new Router()
```

#### **matcher**

Register a matcher function.

```ts
router.matcher(
  'fruit', 
  (param: string): boolean => new Set['apple','banana','orange'].has(param)
)
```

Parameters:
  - `name` (`string`): The matcher function's name.
  - `matcher` (`Matcher`): The matcher function, which takes in a `string` and returns a `boolean`.

#### **route**

Register a route. Use chaining to declare method handlers.

```js
router.route('/user')
  .get(() => new Response('Hello GET, from /user'))
  .post(() => new Response('Hello POST, from /user'))
```

Parameters:
  - `path` (`string`): The URL path to register. Must start with a `/`.

Returns: The route's store instance (`this`), allowing for method chaining.

Throws:
  - `Error` if `path` does not start with a `/`.

#### **getRoutes**

Get all of the routes for the trie.

```js
const routes = router.getRoutes()
```

Returns: `Array<{pattern: string, methods: string[]}>`.

#### **find**

Find a route.

```js
const { store, params } = router.find('/user')
```

Parameters:
  - `path` (`string`): The URL path to find. Must start with a `/`.

Returns an object of:
  - `store` (`Store|null`): The route's store.
  - `params` (`Params`): An object of `Record<string, any>`, or `{}` if there are none.

Throws:
  - `Error` if `path` does not start with a `/`.

### Store class

You cannot import the `Store` class, to create a new instance. It is only accessible when returned from the `router.route()` or `router.find()` calls.

#### Handler methods

There is a class method for all allowed handler methods. They mostly equate to their HTTP method equivalents:

`get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `head()`, `fallback()`

Each one returns the route's store, allowing for method chaining. The `fallback` helper is used to define a handler for any valid methods that aren't explicitly defined.

#### Registering route handlers and hooks

Use the above methods to register handlers and hooks for a route method.

```js
// standalone handler
import { Router } from '@xinkjs/xi'

const router = new Router()
router.route('/')
  .get(() => new Response('Hello GET!))
```
```js
// handler and hooks
import { Router } from '@xinkjs/xi'

const router = new Router()
router.route('/')
  .get(
    (context) => new Response(`Hello GET. Context is ${context}`), // handler
    () => console.log('A route method hook'), // first hook
    async (context, next) => {
      const res = await fetch('https://example.com')
      context.locals.res = await res.json() // `locals` is a contrived object
    } // second hook
  )
```

Parameters:
  - `handler` (`Handler`): The function used to handle a `Request`.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Handler = (context: Record<string, any>, next?: () => Promise<Response | any>) => MaybePromise<Response | any>;
    ```
  - `...hooks`: A comma-separated list of hook functions to register for the method.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook = (context: Record<string, any>, next?: () => Promise<void | any>) => MaybePromise<void | any>;
    ```

#### Registering hooks for all methods of a route

In the previous section, we showed how to define hooks that only run for a specific method. You can also define hooks that run for all defined route methods, by using `hook()`. This method also returns the route's store, so it can be placed anywhere in the chain.

```js
import { Router } from '@xinkjs/xi'

const router = new Router()
router.route('/')
  .post(() => new Response())
  .get(() => new Response())
  .hook(
    () => console.log('Run for all defined route methods'),
    () => console.log('Another route-level hook')
  )
```

Parameters:
  - `...hooks`: A comma-separated list of hook functions to register for the route.
    ```ts
    type MaybePromise<T> = T | Promise<T>;
    type Hook = (context: Record<string, any>, next?: () => Promise<void | any>) => MaybePromise<void | any>;
    ```
