import { DevEnvironment } from 'vite'
/** @import { DevEnvironmentContext, ResolvedConfig } from 'vite' */

/**
 * 
 * @param {string} name 
 * @param {ResolvedConfig} config 
 * @param {DevEnvironmentContext} [context] 
 */
export const createDevEnvironment = (name, config, context) => {
  return new DevEnvironment(name, config, context)
}