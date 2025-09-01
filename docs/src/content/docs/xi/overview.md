---
title: Overview
---

## xi

A fast URL trie router. Pronounced "z".

Designed to do two things:
- register routes
- retrieve route information

xi does not handle storing route information, `Request`s, `Response`s, or even middleware. We leave these up to you, as the creators of API frameworks.

## For Builders

xi is designed to be extended so that you can create other things.

For instance, it defines a Node, which can contain a Store. However, you define the shape of a Store in your API framework and then tell xi about it.
