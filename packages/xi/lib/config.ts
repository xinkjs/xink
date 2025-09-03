import { CONFIG } from './constants'
import type { XiConfig } from '../types'

/**
 * Generic utility which merges two objects.
 */
export const mergeObjects = (current: any, updates: any): any => {
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
 * Merge a user config with the default config.
 */
export const mergeConfig = (default_config: XiConfig, config: Partial<XiConfig>): XiConfig => {
  /**
   * We need to make a deep copy of `dconfig`,
   * otherwise we end up altering the original `CONFIG` because `dconfig` is a reference to it.
   */
  return mergeObjects(structuredClone(default_config), config)
}

/**
 * Validate any passed-in config options and merge with CONFIG.
 */
export const validateConfig = (config: Partial<XiConfig>): XiConfig => {
  if (config === undefined || typeof config !== 'object') throw 'Config must be an object.'

  /* config empty? */
  if (Object.entries(config).length = 0) return CONFIG

  if (config.base_path && typeof config.base_path !== 'string')
    throw new Error(`base_path must be a string, but "${config.base_path}" is a ${typeof config.base_path}.`)

  if (config.base_path && !config.base_path.startsWith('/'))
    throw new Error('base_path must begin with a /')

  if (config.base_path && config.base_path.length === 1)
      throw new Error('base_path cannot be "/"')

  return mergeConfig(CONFIG, config)
}
