import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { getPackageContents } from "./package.ts"

export const createXink = (project_path: string, runtime: string, language: string) => {
    const type = language === 'typescript' ? 'ts' : 'js'
    const entrypoint = `index.${type}`
    const package_file = runtime === 'deno' ? 'deno.json' : 'package.json'
    const package_contents = getPackageContents(runtime)

    /* Create project path. */
    mkdirSync(project_path, { recursive: true })

    if (language === 'bun' || language === 'cloudflare') {
        /* Create project type-checking file. Deno is handled in package.ts */
        writeFileSync(join(project_path, `${type}config.json`),
            `{
    "compilerOptions": {
        "allowJs": true,
        "checkJs": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "isolatedModules": true,
        "moduleResolution": "bundler",
        "module": "esnext",
        "noEmit": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "sourceMap": true,
        "strict": true,
        "target": "esnext",
        "verbatimModuleSyntax": true,
        "jsx": "react-jsx",
        "jsxImportSource": "@xinkjs/xink"
    },
    "include": [
        "vite.config.js",
        "vite.config.ts",
        "src/**/*.js",
        "src/**/*.ts",
        "src/**/*.tsx"
    ],
    "exclude": [
        "node_modules",
        "build"
    ]
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
import adapter from '@xinkjs/adapter-${runtime}'

export default defineConfig(function () {
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

    /* Create Wrangler config. */
    if (runtime === 'cloudflare')
        writeFileSync(join(project_path, 'wrangler.jsonc'),
        `/**
 * For more details on how to configure Wrangler, refer to:
 * https://developers.cloudflare.com/workers/wrangler/configuration/
 */
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "~TODO~",
	"main": "build/_worker.js",
	"compatibility_date": "2025-04-28",
	"observability": {
		"enabled": true
	}
	/**
	 * Smart Placement
	 * Docs: https://developers.cloudflare.com/workers/configuration/smart-placement/#smart-placement
	 */
  // "placement": { "mode": "smart" },

	/**
	 * Bindings
	 * Bindings allow your Worker to interact with resources on the Cloudflare Developer Platform, including
	 * databases, object storage, AI inference, real-time communication and more.
	 * https://developers.cloudflare.com/workers/runtime-apis/bindings/
	 */
  // "r2_buckets": [
  //     {
  //         "binding": "MY_BUCKET",
  //         "bucket_name": "my_bucket"
  //     }
  // ]

	/**
	 * Environment Variables
	 * https://developers.cloudflare.com/workers/wrangler/configuration/#environment-variables
	 */
  // "vars": { "MY_VARIABLE": "production_value" },
	/**
	 * Note: Use secrets to store sensitive data.
	 * https://developers.cloudflare.com/workers/configuration/secrets/
	 */

	/**
	 * Static Assets
	 * https://developers.cloudflare.com/workers/static-assets/binding/
	 */
  // "assets": { "directory": "./public/", "binding": "ASSETS" },

	/**
	 * Service Bindings (communicate between multiple Workers)
	 * https://developers.cloudflare.com/workers/wrangler/configuration/#service-bindings
	 */
  // "services": [{ "binding": "MY_SERVICE", "service": "my-service" }]
}
`.replace(/~TODO~/g, project_path.split("/").at(-1) || "package-name")
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
