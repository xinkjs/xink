const bun = `{
  "name": "~TODO~",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --bun vite",
    "build": "vite build",
    "preview": "bun --bun vite preview",
    "start": "bun run build/server.js"
  }
}
`
const cloudflare = `{
  "name": "~TODO~",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "wrangler dev"
  }
}
`
const deno = `{
  "tasks": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "deno run --allow-env --allow-net --allow-sys --allow-read=. build/server.js"
  },
  "nodeModulesDir": "auto",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@xinkjs/xink"
  },
  "exclude": [
    "node_modules/",
    "build/"
  ]
}
`

const runtime_map: Record<string, string> = {
  bun,
  deno,
  cloudflare
}

export const getPackageContents = (runtime: string) => {
  return runtime_map[runtime]
}
