/** @import { Handle, MaybePromise, RequestEvent } from '../../types.js' */

/* ATTR: SvelteKit */
/**
 * 
 * @param {...Handle} handlers The chain of `handle` functions
 * @returns {Handle}
 */
export function sequence(...handlers) {
 const length = handlers.length;
 if (!length) return (event, resolve) => resolve(event);

 return (event, resolve) => {
   return apply_handle(0, event);

   /**
    * @param {number} i
    * @param {RequestEvent} event
    * @returns {MaybePromise<Response>}
    */
   function apply_handle(i, event) {
     const handle = handlers[i];

     return handle(
       event,
       (event) => {
         return i < length - 1
           ? apply_handle(i + 1, event)
           : resolve(event);
       }
      );
   }
 };
}
