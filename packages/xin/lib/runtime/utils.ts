import type { Handle, MaybePromise, RequestEvent } from "../../types.js"

/* ATTR: SvelteKit */
export function sequence(...handlers: Handle[]): Handle {
 const length = handlers.length;
 if (!length) return (event, resolve) => resolve(event);

 return (event, resolve) => {
   return apply_handle(0, event);

   function apply_handle(i: number, event: RequestEvent): MaybePromise<Response> {
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

/* ATTR: SvelteKit */
export const isContentType = (request: Request, ...types: string[]) => {
  const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? ''
	return types.includes(type.toLowerCase())
}

/**
 * Attempts to infer richer types (boolean, number, null)
 * from query param strings. Keeps original strings if no other type matches.
 * @param {Record<string, string | File | any>} input_obj Object with potentially mixed value types.
 * @returns {Record<string, string | number | boolean | null | File | any>} Object with inferred types for strings.
 */
export function inferObjectValueTypes(input_obj: Record<string, string | File | any>): Record<string, string | number | boolean | null | File | any> {
  const inferred_obj: { [key: string]: any } = {}
  for (const key in input_obj) {
    const value = input_obj[key]

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'null') {
        inferred_obj[key] = null
      } 
      else if (value.toLowerCase() === 'true') {
        inferred_obj[key] = true
      } 
      else if (value.toLowerCase() === 'false') {
        inferred_obj[key] = false
      }
      /**
       * Check for numbers (handle integers and floats).
       * Use Number() for broader parsing but check if it's NaN.
       * Also check if the string representation matches the original value
       * to avoid partial parses like Number("123xyz") -> 123
       */
      else if (value.trim() !== '' && !isNaN(Number(value))) {
        /* Check if converting back to string matches original (handles cases like "1.2.3"). */
        const num_val = Number(value)
        if (String(num_val) === value) {
          inferred_obj[key] = num_val
        } else {
          /* If string representation doesn't match, keep original string. */
          inferred_obj[key] = value
        }
      }
      /* Keep as string if no other type matches. */
      else {
        inferred_obj[key] = value
      }
    }
    else {
      /* If not a string (e.g., File object), keep the original value. */
      inferred_obj[key] = value
    }
  }
  return inferred_obj
}
