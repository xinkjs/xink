const bun = `{
  "name": "~TODO~",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "bun run build/_worker.js"
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
    "start": "deno run --allow-net --allow-sys --allow-read=build build/_worker.js"
  },
  "nodeModulesDir": "auto"
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
