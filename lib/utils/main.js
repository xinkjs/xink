import fs from 'node:fs'
import path from 'node:path'
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
  if (typeof current !== 'object' || typeof updates !== 'object' || Array.isArray(current) || Array.isArray(updates))
    throw new Error("Both 'current' and 'updates' must be passed-in as objects to merge()")

  let merged = { ...current }

  for (let key of Object.keys(updates)) {
    if (typeof updates[key] !== 'object') {
      merged[key] = updates[key]
    } else {
      /* key is an object, run mergeObjects again. */
      merged[key] = mergeObjects(merged[key] || {}, updates[key])
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
  const glob = options?.exact ? new Glob(`${dir}/${options?.filename}.{js,ts}`, {}) : new Glob(`${dir}/**/${options?.filename ?? '*'}.{js,ts}`, {})

  for (const file of glob) {
    yield file
  }
}
