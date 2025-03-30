/* ATTR: SvelteKit */
/**
 * 
 * @param {Request} request 
 * @param  {string[]} types 
 * @returns 
 */
export const isContentType = (request, ...types) => {
  const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? ''
	return types.includes(type.toLowerCase())
}
