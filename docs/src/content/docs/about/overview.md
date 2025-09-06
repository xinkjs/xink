---
title: Overview
---

## What is xinkjs?

A small ecosystem of components for various API framework purposes; each building on top of the previous one.

- **xi** ("z"), a URL trie router.
  - Register routes and retrieve their information.
  - Build your own API framework.
- **xin** ("zen"), an API framework.
  - Defines and stores route information
  - Handles requests and responses; which includes executing any middleware, hooks, and handlers.
  - Comparable to frameworks like Hono and Elysia.
- **xink** ("zinc"), a Vite plugin.
  - Gives you a filesystem router experience instead of traditional methods like (`.get()`, `.post()`, etc).
  - Supported by xinkjs adapters for various environments like bun, cloudflare, and deno.
