---
title: What is xink?
---

xink is a javascript router for building APIs.

Unlike most filesystem routers in the ecosystem, it's directory-based; which we love, because it means your API routes are defined by the directory structure, and endpoint filenames are standarized. It's also a Vite plugin, which pretty much speaks for itself.

We follow in the footsteps of Next's App and SvelteKit's server route conventions by using HTTP methods to name route handler functions (`GET`, `POST`, etc). We believe this helps DX by standardizing on a naming convention, which, again, is one less thing you have to think about.

## File vs Directory

In a file-based router, routes can be created from a combination of directory and `index` files, but also other filenames. In the example below, `about.ts` creates an `/about` route, but this route could also be defined with `/about/index.ts`.

```
src/
└── routes/
    ├── about/
    │   └── index.ts
    ├── about.ts duplicate route!
    └── index.ts
```

In a directory-based router, routes are only created from a combination of directory and file names. Each framework defines what the name of endpoint files must be. xink uses `route`.

```
src/
└── routes/
    ├── about/
    │   └── route.ts
    ├── about.ts not a route!
    └── route.ts
```
