/** @import { DefaultConfig, ValidatedConfig } from '../types/internal.js' */
/** @import { XinkConfig } from '../../types.js' */
import { CONFIG, SUPPORTED_RUNTIMES, ENTRYPOINT_DEFAULTS } from '../constants.js'
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

  const dirs = new Set(['middleware_dir', 'out_dir', 'params_dir', 'routes_dir'])

  dirs.forEach((d) => {
    if (config[d] && typeof config[d] !== 'string')
      throw new Error(`Config ${d} directory must be a string.`)
  })

  if (!config.runtime)
    throw new Error('`runtime` is required in the xink plugin configuration.')

  if (!SUPPORTED_RUNTIMES.has(config.runtime)) {
    const size = SUPPORTED_RUNTIMES.size
    const values = [...SUPPORTED_RUNTIMES]
    let supported_runtimes = ''

    for (let e = 0; e < size; e++) {
      if (e === size - 1)
        supported_runtimes += `and ${values[e]}`
      else
        supported_runtimes += `${values[e]}, `
    }

    throw new Error(`Config runtime "${config.runtime}" is invalid. Only ${supported_runtimes} are supported.`)
  }

  if (!config.entrypoint)
    config.entrypoint = ENTRYPOINT_DEFAULTS.get(config.runtime)

  return mergeConfig(CONFIG, config)
}
