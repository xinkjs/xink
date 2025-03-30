#!/usr/bin/env node

import pkg from './package.json' with { type: 'json' }
import { program } from 'commander'
import { create } from './commands/create.ts'

program.name(pkg.name).version(pkg.version, '-v, --version')
program.addCommand(create)
program.parse()
