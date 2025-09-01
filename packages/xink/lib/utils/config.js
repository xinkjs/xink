/** @import { Config } from '../types/internal.js' */
/** @import { XinkConfig } from '../../types.js' */
import { CONFIG } from '../constants.js'
import { mergeObjects } from './main.js'

/**
 * Merge a user config with the default config.
 * 
 * @param {Config} dconfig
 * @param {XinkConfig} config
 * @returns {Config}
 */
export const mergeConfig = (dconfig, config) => {
  /**
   * We need to make a deep copy of `dconfig`,
   * otherwise we end up altering the original `CONFIG` because `dconfig` is a reference to it.
   */
  return mergeObjects(structuredClone(dconfig), config)
}

/**
 * Validate any passed-in config options and merge with CONFIG.
 *
 * @param {XinkConfig} config
 * @returns {Config}
 */
export const validateConfig = (config) => {
  if (config === undefined || typeof config !== 'object') throw 'Config must be an object.'

  /* config empty? */
  if (Object.entries(config).length = 0) return CONFIG

  const forbidden_dirs = new Set(['middleware_dir', 'params_dir', 'routes_dir'])

  forbidden_dirs.forEach((d) => {
    /* Do not allow overwriting default directory. */
    if (config[d])
      delete config[d]
  })

  if (config.out_dir && typeof config.out_dir !== 'string')
    throw new Error(`out_dir must be a string.`)

  if (config.entrypoint && !/\w+\.[js|ts]/.test(config.entrypoint))
    throw new Error(`entrypoint must be a filename that ends with .js or .ts, but found "${config.entrypoint}".`)

  return mergeConfig(CONFIG, config)
}
