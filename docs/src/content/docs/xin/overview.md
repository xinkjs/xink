---
title: Overview
---

## xin

A fabulous API router. Pronounced "zen".

Built on top of xi, it's main focus is handling Requests and Responses.

Features include support for:
- Middleware
- Route & Method hooks
- JSX
- Standard Schema data validation
- OpenAPI
- Scalar-powered API docs
- Typed client generation

## Middleware vs Hooks

xin's philosophy is that middleware, hooks, and handlers are different.

Middleware:
- have access to all requests and responses
- can return a response

Hooks:
- only have access to a request
- cannot return a response

Handlers:
- only have access to a request
- can return a response
