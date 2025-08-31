export const openapi_template = (spec: any, options: any) => {
  const config = {
    content: spec,
    ...options
  }
  return `<!doctype html>
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
      id="xin-api-scalar"
    ></div>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    
    <script>
      Scalar.createApiReference('#xin-api-scalar', ${JSON.stringify(config)})
    </script>
  </body>
</html>`
}
