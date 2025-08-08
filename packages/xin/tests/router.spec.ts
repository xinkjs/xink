import { expect, test, vi } from 'vitest'
import { Router } from '../index.js'

const api = new Router()

api.use(() => new Response('Hello from global middleware!'))
