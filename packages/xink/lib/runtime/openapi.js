export const openapi_template = (spec, options) => `<!doctype html>
<html>
  <head>
    <title>Scalar API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div
      id="api-reference"
    >
      ${JSON.stringify(spec)}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    
    <script>
      Scalar.createApiReference('#api-reference', ${JSON.stringify(options)})
    </script>
  </body>
</html>`
