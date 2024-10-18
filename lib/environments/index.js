/** @import { DevEnvironmentContext, ResolvedConfig } from 'vite' */
import { DevEnvironment } from 'vite'

/**
 * Create a Bun dev environment.
 * 
 * @param {string} name 
 * @param {ResolvedConfig} config 
 * @param {DevEnvironmentContext} [context] 
 */
export const createBunDevEnvironment = (name, config, context) => {
  return new DevEnvironment(name, config, context)
}