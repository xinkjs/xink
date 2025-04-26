import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { getPackageContents } from "./package.ts"

const entrypoint_map: Record<string, string> = {
    bun: 'index',
    deno: 'index',
    cloudflare: 'main'
}

export const createXink = (project_path: string, runtime: string, language: string) => {
    const type = language === 'typescript' ? 'ts' : 'js'
    const entrypoint = `${entrypoint_map[runtime]}.${type}`
    const package_file = runtime === 'deno' ? 'deno.json' : 'package.json'
    const package_contents = getPackageContents(runtime)

    /* Create project path. */
    mkdirSync(project_path, { recursive: true })

    if (language !== 'none') {
        /* Create xink type-checking file. */
        mkdirSync(join(project_path, '.xink'), { recursive: true })
        writeFileSync(join(project_path, `.xink/tsconfig.json`),
            `{
    "compilerOptions": {
        "paths": {
            "$lib": [
                "../src/lib"
            ],
            "$lib/*": [
                "../src/lib/*"
            ]
        },
        "verbatimModuleSyntax": true,
        "isolatedModules": true,
        "moduleResolution": "bundler",
        "module": "esnext",
        "noEmit": true,
        "target": "esnext"
    },
    "include": [
        "../vite.config.js",
        "../vite.config.ts",
        "../src/**/*.js",
        "../src/**/*.ts",
        "../src/**/*.tsx
    ],
    "exclude": [
        "../node_modules/**"
    ]
}
`
        )

        /* Create project type-checking file. */
        writeFileSync(join(project_path, `${type}config.json`),
            `{
    "extends": "./.xink/${type}config.json",
    "compilerOptions": {
        "allowJs": true,
        "checkJs": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "sourceMap": true,
        "strict": true,
        "moduleResolution": "bundler"
    }
}
`
        )
    }

    /* Create the entrypoint. */
    writeFileSync(join(project_path, entrypoint),
        `import { Xink } from '@xinkjs/xink'

const api = new Xink()

export default api
`
    )

    /* Create Vite config. */
    writeFileSync(join(project_path, 'vite.config.js'),
        `import { xink } from '@xinkjs/xink'
import { defineConfig } from 'vite'
import adapter from 'adapter-${runtime}'

export default defineConfig(async function () {
    return {
        plugins: [
            xink({ 
                adapter,
            })
        ]
    }
})
`
    )

    /* Create package file. */
    writeFileSync(join(project_path, package_file), package_contents.replace(/~TODO~/g, project_path.split("/").at(-1) || "package-name"))

    /* Create routes directory and example route. */
    const route_contents = language === 'typescript' ?
        `import { type RequestEvent } from '@xinkjs/xink'

export const GET = ({ text }: RequestEvent) => {
    return text('Welcome to xink!')
}
    ` : `${language === 'checkjs' ? 
        `/**
 * 
 * @param {import('@xinkjs/xink').RequestEvent} event 
 * @returns {Response}
 */
`
    : ''}export const GET = ({ text }) => {
    return text('Welcome to xink!')
}
`
    mkdirSync(join(project_path, 'src/routes'), { recursive: true })
    writeFileSync(join(project_path, 'src/routes', `route.${type}`), route_contents)
}
