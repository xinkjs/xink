import { Glob } from 'glob'

/**
 * Generic utility which merges two objects.
 * 
 * @param {any} current
 * @param {any} updates
 * @returns {any}
 */
export const mergeObjects = (current, updates) => {
  if (!current || !updates)
    throw new Error("Both 'current' and 'updates' must be passed-in to merge()")
  if (typeof current !== 'object' || typeof updates !== 'object')
    throw new Error("Both 'current' and 'updates' must be passed-in as objects to merge()")

  let merged = { ...current }

  for (let key of Object.keys(updates)) {
    const current_value = merged[key]
    const update_value = updates[key]

    if (Array.isArray(current_value) && Array.isArray(update_value)) {
      /* Merge arrays. */
      merged[key] = [...new Set([...current_value, ...update_value])]
    } else if (typeof update_value === 'object' && update_value !== null && Array.isArray(update_value) &&
      typeof current_value === 'object' && current_value !== null && !Array.isArray(current_value)) {
      /* Both are non-null, non-array objects, so recurse. */
      merged[key] = mergeObjects(current_value, update_value)
    } else {
      /**
       * Otherwise (primitive, null, or current_value is not an object to merge into),
       * the update value simply overwrites.
       */
      merged[key] = update_value
    }
  }

  return merged
}

/**
 * 
 * @param {string} dir
 * @param {{ exact?: boolean, filename?: string }} [options]
 * @returns {Generator<string>}
 */
export function* readFiles(dir, options) {
  const glob = options?.exact ? new Glob(`${dir}/${options?.filename}.{js,ts,jsx,tsx}`, {}) : new Glob(`${dir}/**/${options?.filename ?? '*'}.{js,ts,jsx,tsx}`, {})

  for (const file of glob) {
    yield file
  }
}
