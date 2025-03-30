We welcome contributions from the community!

Here are a few things to keep in mind:

- If a PR is going to be large, please open an discussion first. This may save you a lot of effort on something we either don't plan to implement or are already working on internally.
- Each file must end with a single line return.
- We do NOT end code with a semi-colon (`;`).
- We use arrow functions.

## Naming Conventions

### camelCase

```ts
/* functions */
const someFunction = () => {}
```

```ts
/* methods */
class SomeClass {
  constructor() {}

  getThing() {},
  setThing() {}
}
```

### snake_case

```ts
/* let, const (non-functions), objects (without methods), object keys */
let some_thing
const other_thing
const some_object = {
  some_object_key: true
}
```

### InitialCase

```ts
/* classes */
class SomeClass {}

/* type aliases, interfaces */
type SomeAlias = {}
interface SomeInterface {}

/* object with methods */
const SomeObject = {
  thing: true,

  doThing() { return !thing }
  setThing(value) { thing = value }
}
```

## PR labeling

To keep the community updated on a PR's status, we implement the following labels. If you have feedback, please join the [discussion](https://github.com/xinkjs/xink/discussions/1).

- A PR is not required to go through any or all positive steps on its way to being merged.
- The labeling system is not strictly required for every PR; but this should be an exception, not the rule.
- New PRs will not be automatically given a default label.

### Labels

- `considering` - Being talked about; whether to accept or decline.
- `declined` - Not planned. An explanation may be provided.
- `accepted` - Planned. The PR may be approved and/or assigned.
- `reviewing` - A member or maintainer has started the process of reviewing the code.
- `testing` - A member or maintainer has started the process of testing the code.
- `abandoned` - Rejected for some reason, after being accepted. An explanation must be provided.
- `ready` - Waiting to be merged. The PR must be approved.
- `merged` - Self-explanatory, and we may not even use this label.
- `reverted` - PR was reverted. An explanation must be provided.

We are still working through the details of the label implementation. e.g. If a PR requires `considering`, once it's `declined` or `accepted` it makes sense to remove the `considering` label. However, if a PR is `accepted`, that label might remain; and subsequent labels, like `reviewing` or `testing`, may be added; resulting in two or more labels on a PR at once.
