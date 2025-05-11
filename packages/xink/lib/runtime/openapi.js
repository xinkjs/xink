import { mergeObjects } from "../utils/main.js"

export const openapi_template = (spec) => `<!doctype html>
<html>
  <head>
    <title>Scalar API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      type="application/json"
    >
      ${JSON.stringify(spec)}
    </script>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

const convertSchema = (entries) => {
  const properties = {}
  const required_fields = []

  for (const property_name in entries) {
    const standard_schema = entries[property_name]
    const is_required = standard_schema.type !== 'optional'

    const schema = standard_schema.wrapped || standard_schema

    if (schema) {
      properties[property_name] = schema
      if (is_required)
        required_fields.push(property_name)
    }
  }

  if (Object.keys(properties).length > 0) {
    const schema = {
      type: 'object',
      properties
    }

    if (required_fields.length > 0)
      schema.required = required_fields

    return schema
  }

  return null
}

/**
 * Generates OpenAPI operation objects for a route, inferring from SCHEMAS
 * and merging with a manual OPENAPI export.
 * 
 * @param {Record<string, any> | null | undefined} schemas_export The SCHEMAS export from the route.
 * @param {Record<string, any> | null | undefined} openapi_export The OPENAPI export from the route.
 * @returns {Record<string, any>} An object mapping HTTP methods (lowercase) to OpenAPI Operation Objects.
 */
export const generateOpenapiForRouteMethods = (schemas_export, openapi_export) => {
  const openapi_by_method = {}
  const methods_to_process = new Set()

  if (schemas_export)
    Object.keys(schemas_export).forEach(method => methods_to_process.add(method))

  if (openapi_export)
    Object.keys(openapi_export).forEach(method => methods_to_process.add(method))

  for (const method of methods_to_process) {
    const method_schemas = schemas_export?.[method] || {}
    const manual_method_openapi = openapi_export?.[method] || {}

    const inferred_operation = {}

    /* Infer Parameters (Query & Path) from SCHEMAS. */
    inferred_operation.parameters = []
    if (method_schemas.query?.type == 'object' && method_schemas.query.entries) {
      for (const param_name in method_schemas.query.entries) {
        const schema = method_schemas.query.entries[param_name]

        /* Determine if required based on the wrapper's type. */
        const required = schema?.type !== 'optional'

        inferred_operation.parameters.push({
          name: param_name,
          in: 'query',
          required,
          schema, // Assuming schema is already a JSON Schema object
          description: schema.description || '',
        })
      }
    }
    if (method_schemas.params?.type === 'object' && method_schemas.params.entries) {
      for (const param_name in method_schemas.params.entries) {
        const schema = method_schemas.params.entries[param_name]

        inferred_operation.parameters.push({
            name: param_name,
            in: 'path',
            required: true, // Path params are always required
            schema,
            description: schema.description || '',
        })
      }
    }
    if (inferred_operation.parameters.length === 0)
      delete inferred_operation.parameters

    /* Infer json or form from SCHEMAS. */
    if (method_schemas.json?.type === 'object' && method_schemas.json.entries) {
      const schema = convertSchema(method_schemas.json.entries)

      if (schema)
        inferred_operation.requestBody = {
          content: {
            'application/json': {
              schema
            }
          },
          required: method_schemas.json.type !== 'optional'
        }
    } else if (method_schemas.form?.type === 'object' && method_schemas.form.entries) {
      const schema = convertSchema(method_schemas.form.entries)

      if (schema)
        /* Could be application/x-www-form-urlencoded or multipart/form-data */
        inferred_operation.requestBody = {
          content: {
            /* Defaulting to urlencoded, user can override with manual OPENAPI. */
            'application/x-www-form-urlencoded': {
              schema
            }
          },
          required: method_schemas.form.type !== 'optional'
        }
    }

    /* Deep Merge with Manual OPENAPI (Manual takes precedence). */
    const final_operation = mergeObjects({ ...inferred_operation }, manual_method_openapi)

    // Merge parameters: manual ones replace inferred if name and 'in' match, otherwise append
    if (manual_method_openapi.parameters || inferred_operation.parameters) {
      const base_parameters = inferred_operation.parameters || []
      const manual_parameters = manual_method_openapi.parameters || []
      const merged_parameters = []
      const seen_params = new Set() // To track params already processed from manual
  
      // Add all manual parameters, potentially overriding inferred ones
      manual_parameters.forEach(manual_param => {
        merged_parameters.push(manual_param)
        seen_params.add(`${manual_param.name}:${manual_param.in}`)
      })
  
      // Add inferred parameters only if they weren't already covered by a manual one
      base_parameters.forEach(inferred_param => {
        if (!seen_params.has(`${inferred_param.name}:${inferred_param.in}`)) {
          merged_parameters.push(inferred_param)
        }
      })
  
      if (merged_parameters.length > 0) {
        final_operation.parameters = merged_parameters
      } else {
        delete final_operation.parameters // Remove if empty
      }
    }

    if (manual_method_openapi.requestBody)
      final_operation.requestBody = manual_method_openapi.requestBody // Manual requestBody completely overrides


    if (Object.keys(final_operation).length > 0)
      openapi_by_method[method] = final_operation
  }

  return openapi_by_method
}
