type Release = {
  kind: string
  name: string
  version: string
}

type PublishPlan = { plan: Release[][] }

export {}

const plan_path = process.argv[2]
if (!plan_path)
  throw new Error('Usage: assert-packages-published.ts <publish-plan.json>')

const plan = await Bun.file(plan_path).json() as PublishPlan
const unpublished = plan.plan
  .flat()
  .filter(release => release.kind === 'publish')

if (unpublished.length > 0) {
  const packages = unpublished
    .map(release => `${release.name}@${release.version}`)
    .join(', ')
  throw new Error(`Approve these staged packages on npm before finalizing: ${packages}`)
}

console.log('All versioned packages are published; release finalization can continue.')
