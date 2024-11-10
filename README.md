# eslint-json-compat-utils

A utility that converts rules made for checking the AST of `jsonc-eslint-parser` into rules compatible with `@eslint/json`.

## Installation

```bash
npm install eslint-json-compat-utils
```

## Usage

```js
import { toCompatRule } from "eslint-json-compat-utils";

export default toCompatRule({
  meta: { /* ... */ },
  create(context) {
    return {
      JSONArrayExpression: check,
    };
  },
})
```

### API

#### `toCompatRule(rule)`

Converts a rule object for `jsonc-eslint-parser` into a rule object for `@eslint/json` compatible.

#### `toCompatPlugin(plugin)`

Converts a plugin object for `jsonc-eslint-parser` into a plugin object for `@eslint/json` compatible.

#### `toCompatCreate(create)`

Converts a `create` function for `jsonc-eslint-parser` into a `create` function for `@eslint/json` compatible.
