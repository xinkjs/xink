import { dirname, resolve } from 'node:path'

type PublishRelease = {
  kind: 'publish'
  name: string
  version: string
  access: 'public' | 'restricted'
  tag: string
  tarball: {
    path: string
  }
}

type Release = PublishRelease | { kind: string, name: string, version: string }
type PublishPlan = { plan: Release[][] }

const plan_path = process.argv[2]
const print_only = process.argv.includes('--print-only')

if (!plan_path)
  throw new Error('Usage: stage-packages.ts <publish-plan.json> [--print-only]')

const plan = await Bun.file(plan_path).json() as PublishPlan
const publish_chunks = plan.plan.filter(chunk =>
  chunk.some(release => release.kind === 'publish')
)
const chunk = publish_chunks[0] ?? []
const release = chunk.find(release => release.kind === 'publish')
let staged_count = 0

if (release?.kind === 'publish') {
  const publish_release = release as PublishRelease
  const tarball_path = resolve(dirname(plan_path), publish_release.tarball.path)
  const command = [
    'npm',
    'stage',
    'publish',
    tarball_path,
    '--access',
    publish_release.access,
    '--tag',
    publish_release.tag,
  ]

  console.log(`Staging ${publish_release.name}@${publish_release.version}`)
  if (!print_only) {
    const process = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' })
    const exit_code = await process.exited
    if (exit_code !== 0)
      throw new Error(`Failed to stage ${publish_release.name}@${publish_release.version}`)
  }

  staged_count++
}

if (staged_count === 0)
  console.log('No unpublished packages to stage.')
else {
  const remaining_count = publish_chunks
    .flat()
    .filter(release => release.kind === 'publish')
    .length - staged_count
  if (remaining_count > 0)
    console.log(`${remaining_count} package(s) remain. Approve this package, then rerun staging.`)
}
