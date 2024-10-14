import { DevEnvironment } from 'vite'
/** @import { DevEnvironmentContext, ResolvedConfig } from 'vite' */

/**
 * 
 * @param {string} name 
 * @param {ResolvedConfig} config 
 * @param {DevEnvironmentContext} [context] 
 */
export const createDevEnvironment = (name, config, context) => {
  console.log('creating dev env', context)

  return new DevEnvironment(name, config, context)
}