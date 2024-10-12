/** @import { DefaultConfig, ValidatedConfig } from '../types/internal.js' */
/** @import { XinkConfig } from '../../types.js' */
import { CONFIG } from '../constants.js'
import { mergeObjects } from './main.js'

/**
 * Merge a user config with the default config.
 * 
 * @param {DefaultConfig} dconfig
 * @param {XinkConfig} config
 * @returns {ValidatedConfig}
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
 * @returns {ValidatedConfig}
 */
export const validateConfig = (config) => {
  if (typeof config !== 'object') throw 'Config must be an object.'

  /* config empty? */
  if (Object.entries(config).length = 0) return CONFIG

  const dirs = new Set(['middleware', 'params', 'routes'])

  dirs.forEach((d) => {
    if (config[d] && typeof config[d] !== 'string')
      throw new Error(`Config ${d} directory must be a string.`)
  })

  return mergeConfig(CONFIG, config)

}
