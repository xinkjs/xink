import { DevEnvironment, RemoteEnvironmentTransport } from 'vite'
/** @import { DevEnvironmentContext, ResolvedConfig, ModuleRunnerOptions } from 'vite' */

/**
 * 
 * @param {string} name 
 * @param {ResolvedConfig} config 
 * @param {DevEnvironmentContext} [context] 
 */
export const createBunDevEnvironment = (name, config, context) => {
  console.log('creating bun dev env', context)
  const transport = new RemoteEnvironmentTransport({

  })
  return new DevEnvironment(name, config, context)
}