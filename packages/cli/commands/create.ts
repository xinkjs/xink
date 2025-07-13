import { Command, Option } from "commander"
import * as v from 'valibot'
import * as p from '@clack/prompts'
import path from 'node:path'
import fs from 'node:fs'
import { createXink } from "../lib/utils.ts"

const language_types = ['typescript', 'checkjs', 'none'] as const
type LanguageTypes = (typeof language_types)[number]
const langs = [ 'ts', 'jsdoc' ] as const
const lang_option = new Option('--types <lang>', 'add type checking').choices(langs)
const lang_map: Record<string, LanguageTypes | undefined> = {
	ts: 'typescript',
	jsdoc: 'checkjs',
	false: 'none'
}

const runtimes = [ 'bun', 'deno', 'cloudflare' ] as const
const runtime_option = new Option('--runtime <name>', 'set a runtime').choices(runtimes)

const options_schema = v.strictObject({
    types: v.pipe(
        v.optional(v.union([v.picklist(langs), v.boolean()])),
        v.transform((lang) => lang_map[String(lang)])
    ),
    runtime: v.optional(v.picklist(runtimes))
})
type Options = v.InferOutput<typeof options_schema>

const project_path_schema = v.optional(v.string())
type ProjectPath = v.InferOutput<typeof project_path_schema>

export const create = new Command('create')
    .description('Create a new xink project')
    .argument('[path]', 'where the project will be created')
    .addOption(lang_option)
    .addOption(runtime_option)
    .action(async (project_path: ProjectPath, opts: Options) => {
        const cwd = v.parse(project_path_schema, project_path)
        const options = v.parse(options_schema, opts)

        const { directory, runtime, language } = await p.group(
            {
                directory: () => {
                    if (cwd) {
                        return Promise.resolve(path.resolve(cwd))
                    }

                    const default_path = './'
                    return p.text({
                        message: 'Where should we create the project?',
                        placeholder: `  (hit Enter to use '${default_path})`,
                        defaultValue: default_path
                    })
                },
                force: async ({ results: { directory } }) => {
                    if (
                        fs.existsSync(directory!) && 
                        fs.readdirSync(directory!).filter((x) => !x.startsWith('.git')).length > 0
                    ) {
                        const force = await p.confirm({
                            message: "Directory is not empty. Continue?",
                            initialValue: false
                        })
                        if (p.isCancel(force) || !force) {
                            p.cancel('Exiting.')
                            process.exit(0)
                        }
                    }
                },
                runtime: () => {
                    if (options.runtime) return Promise.resolve(options.runtime)

                    return p.select({
                        message: 'What runtime will you use?',
                        options: runtimes.map((r) => ({ label: r, value: r }))
                    })
                },
                language: () => {
                    if (options.types) return Promise.resolve(options.types)
                    
                    return p.select({
                        message: 'Will you use type checking?',
                        initialValue: 'typescript',
                        options: [
                            { label: 'Yes, with Typescript', value: 'typescript' },
                            { label: 'Yes, with JSDoc', value: 'checkjs' },
                            { label: 'No', value: 'none' }
                        ]
                    })
                }
            },
            {
                onCancel: () => {
                    p.cancel('Setup canceled.')
                    process.exit(0)
                }
            }
        )

        project_path = path.resolve(directory)

        createXink(project_path, runtime, language)

        p.log.success('Project created')

        /* Create next steps. */
        const steps = [
            'Next Steps:',
            `  cd ${project_path.split('/').at(-1)}`,
            `  ${runtime === 'bun' ? 'bun add -D vite @xinkjs/xink @xinkjs/adapter-bun' : runtime === 'deno' ? 'deno add -D npm:vite npm:@xinkjs/xink npm:@xinkjs/adapter-deno npm:@deno/vite-plugin' : 'npm add -D vite @xinkjs/xink @xinkjs/adapter-cloudflare'}`,
            `  ${runtime === 'bun' ? 'bun run dev' : runtime === 'deno' ? 'deno task dev' : 'npm run dev'}`
        ]
        p.log.info(steps.join('\n'))
        p.outro(`You're all set!`)
    })
