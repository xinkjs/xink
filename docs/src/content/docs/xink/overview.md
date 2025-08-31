---
title: What is xink?
---

xink is a Vite Plugin that gives you a filesystem router experience.

Unlike most filesystem routers in the ecosystem, it's directory-based; which we love, because it means your API routes are defined by the directory structure, and endpoint filenames are standarized.

We follow in the footsteps of Next's App and SvelteKit's server route conventions by using HTTP methods to name route handler functions (`GET`, `POST`, etc). We believe this helps DX by standardizing on a naming convention, which, again, is one less thing you have to think about.

## File vs Directory

In a file-based router, routes can be created from a combination of directory and `index` files, but also other filenames. In the example below, `about.ts` creates an `/about` route, but this route could also be defined with `/about/index.ts`.

```
src/
└── routes/
    ├── about/
    │   └── index.ts
    ├── about.ts  //duplicate route!
    └── index.ts
```

In a directory-based router, routes are only created from a combination of directory and file names. Each framework defines what the name of endpoint files must be. xink uses `route`.

```
src/
└── routes/
    ├── about/
    │   └── route.ts
    ├── about.ts  //not a route!
    └── route.ts
```

## Attributions
xink stands on the shoulders of giants. A special shoutout and thanks goes to [SvelteKit](https://github.com/sveltejs/kit), as I used some of their code for various things; as it was not feasible to fork their code directly, and there's no reason to re-invent the wheel. Therefore, I've added a copyright for them in the license and marked relevant code with a short attribution.

Thanks to [Deigo Rodríguez Baquero](https://github.com/DiegoRBaquero) for donating the `xk` npm package, which is our cli tool.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
