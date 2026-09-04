import { Node, Xi } from '../index.js'
import { BaseStore } from '../types.js'

class Store extends BaseStore {}

class Router extends Xi<Store> {
  protected getStoreConstructor() {
    return Store
  }
}

const withRoute = (path: string) => {
  const router = new Router()
  router.route(path)
  return router
}

const matcherRouter = new Router()
const matcherNames = Array.from({ length: 100 }, (_, index) =>
  `m${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + index % 26)}`
)

for (const [index, name] of matcherNames.entries()) {
  matcherRouter.matcher(name, () => index === matcherNames.length - 1)
  matcherRouter.route(`/:id=${name}/details`)
}

const cases: Array<[string, Router, string]> = [
  ['static', withRoute('/health'), '/health'],
  ['dynamic', withRoute('/users/:id'), '/users/123456'],
  ['matcher', withRoute('/orders/:id=number'), '/orders/123456'],
  ['mixed', withRoute('/asset-:name'), '/asset-logo'],
  ['mixed matcher', withRoute('/version/v:id=number'), '/version/v123456'],
  ['wildcard', withRoute('/files/*path'), '/files/css/site/main.css'],
  ['8 dynamic params', withRoute('/deep/:a/:b/:c/:d/:e/:f/:g/:h'), '/deep/a/b/c/d/e/f/g/h'],
  ['100 matcher siblings', matcherRouter, '/123456/details'],
  ['miss after matcher scan', matcherRouter, '/missing/path'],
]

const iterations = 100_000
const warmupIterations = 10_000
const samples = 5
let checksum = 0

console.log(`Node ${process.version}; ${iterations.toLocaleString()} lookups; median of ${samples} samples`)

for (const [name, router, path] of cases) {
  for (let i = 0; i < warmupIterations; i++)
    checksum += router.find(path).store ? 1 : 0

  const timings: number[] = []
  for (let sample = 0; sample < samples; sample++) {
    const start = process.hrtime.bigint()
    for (let i = 0; i < iterations; i++)
      checksum += router.find(path).store ? 1 : 0
    timings.push(Number(process.hrtime.bigint() - start))
  }

  timings.sort((a, b) => a - b)
  const elapsed = timings[Math.floor(samples / 2)]
  const nsPerOperation = elapsed / iterations
  const operationsPerSecond = 1e9 / nsPerOperation
  console.log(`${name.padEnd(24)} ${operationsPerSecond.toFixed(0).padStart(9)} ops/s  ${nsPerOperation.toFixed(0).padStart(6)} ns/op`)
}

// Keep lookup results observable to the runtime.
if (checksum === Number.MIN_SAFE_INTEGER)
  console.log(checksum)

const routeCount = 20_000
const heapBefore = process.memoryUsage().heapUsed
const registrationStart = process.hrtime.bigint()
const largeRouter = new Router()
for (let index = 0; index < routeCount; index++)
  largeRouter.route(`/routes/${index}/leaf`)
const registrationNs = Number(process.hrtime.bigint() - registrationStart)
const heapDelta = process.memoryUsage().heapUsed - heapBefore
let nodeCount = 0
let allocatedMapCount = 0
const visit = (node: Node<Store>) => {
  nodeCount++
  allocatedMapCount += Number(node.static_children_map !== null)
  allocatedMapCount += Number(node.matcher_children_map !== null)
  allocatedMapCount += Number(node.mixed_children_map !== null)
  for (const child of node.static_children_map?.values() ?? []) visit(child)
  for (const child of node.matcher_children_map?.values() ?? []) visit(child)
  for (const child of node.mixed_children_map?.values() ?? []) visit(child)
  if (node.dynamic_child) visit(node.dynamic_child)
  if (node.wildcard_child) visit(node.wildcard_child)
}
visit(largeRouter.root)

console.log(`\n${routeCount.toLocaleString()} route registrations`)
console.log(`${(registrationNs / routeCount).toFixed(0)} ns/route; approximately ${(heapDelta / 1024 / 1024).toFixed(1)} MiB heap delta`)
console.log(`${nodeCount.toLocaleString()} nodes; ${allocatedMapCount.toLocaleString()} of ${(nodeCount * 3).toLocaleString()} possible child maps allocated`)
