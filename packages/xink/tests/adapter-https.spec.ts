import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { get } from 'node:https'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import bunAdapter from '../../adapter-bun/index.js'
import denoAdapter from '../../adapter-deno/index.js'

const root = mkdtempSync(join(tmpdir(), 'xink-https-'))
const cert_file = join(root, 'cert.pem')
const key_file = join(root, 'key.pem')

beforeAll(() => {
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key_file,
    '-out', cert_file,
    '-subj', '/CN=127.0.0.1',
    '-days', '1',
    '-addext', 'subjectAltName=IP:127.0.0.1'
  ], { stdio: 'ignore' })
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

test.each([
  {
    name: 'Bun',
    adapter: bunAdapter,
    command: 'bun',
    args: (entry: string) => [entry],
    env_api: 'process.env.PORT',
    certificate_api: 'Bun.file(certFile)'
  },
  {
    name: 'Deno',
    adapter: denoAdapter,
    command: 'deno',
    args: (entry: string) => ['run', '--allow-env', '--allow-net', '--allow-read', entry],
    env_api: "Deno.env.get('PORT')",
    certificate_api: 'Deno.readTextFile(certFile)'
  }
])('$name generated server supports runtime HTTPS', async runtime => {
  const out_dir = join(root, runtime.name.toLowerCase())
  mkdirSync(out_dir)
  writeFileSync(
    join(out_dir, 'index.js'),
    'export default { fetch() { return new Response("secure") } }\n'
  )

  await runtime.adapter().adapt({
    entrypoint: 'index.ts',
    out_dir,
    api_chunk_filename: 'index.js',
    log() {},
    vite_root: root,
    xink_config: {} as never
  })

  const entry = join(out_dir, 'server.js')
  const generated = readFileSync(entry, 'utf8')
  expect(generated).toContain(runtime.env_api)
  expect(generated).toContain(runtime.certificate_api)
  expect(generated).not.toContain('BEGIN PRIVATE KEY')

  const child = spawn(runtime.command, runtime.args(entry), {
    cwd: out_dir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '0',
      TLS_CERT_FILE: cert_file,
      TLS_KEY_FILE: key_file
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  try {
    const url = await waitForServer(child)
    expect(url).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/?$/)
    expect(await request(url)).toBe('secure')
  } finally {
    child.kill()
  }
}, 15_000)

function waitForServer(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for generated server. Output:\n${output}`))
    }, 10_000)

    const read = (chunk: Buffer) => {
      output += chunk.toString()
      const match = output.match(/Server listening on (https:\/\/\S+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    }

    child.stdout?.on('data', read)
    child.stderr?.on('data', read)
    child.on('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('exit', code => {
      if (code !== null) {
        clearTimeout(timeout)
        reject(new Error(`Generated server exited with code ${code}. Output:\n${output}`))
      }
    })
  })
}

function request(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, { rejectUnauthorized: false }, response => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => body += chunk)
      response.on('end', () => resolve(body))
    }).on('error', reject)
  })
}
