# dsh-tool-json

A small set of deterministic JSON tools for [DeepSeek Harness](https://deepseek.com/harness/en/). It can format JSON, validate JSON, and read nested values with simple paths.

The tools do not call the network, run shell commands, access a database, or use a browser.

## Quick install

### Requirements

You need Node.js 22 or newer, `pnpm`, and a DeepSeek Harness installation that supports JavaScript or TypeScript plugins.

### Step 1: Download and build

Copy and run:

```bash
git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm --filter dsh-tool-json build
```

### Step 2: Create the plugin configuration

Run this command from the repository root:

```bash
cat > packages/dsh-tool-json/json-tools.patch.yml <<EOF
- insert:
    - id: dsh-tool-json
      name: '$PWD/packages/dsh-tool-json/dist/src/index.js'
EOF
```

The path is absolute because the Harness patch loader requires an absolute plugin path.

### Step 3: Start Harness with the plugin

If Harness is installed as a command:

```bash
dsh web --patch "$PWD/packages/dsh-tool-json/json-tools.patch.yml"
```

Otherwise, run:

```bash
npx @deepseek-ai/dsh web --patch "$PWD/packages/dsh-tool-json/json-tools.patch.yml"
```

## Verify the installation

Ask the Agent:

```text
把下面的 JSON 格式化并按字母顺序排列键名：{"user":{"name":"Ada"},"active":true}
```

If the plugin is loaded, the Agent can use `json_format` and return formatted JSON.

## Available tools

| Tool            | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `json_format`   | Format JSON with optional indentation and recursive key sorting. |
| `json_validate` | Check whether text is valid JSON and explain invalid input.      |
| `json_query`    | Read values using paths such as `user.name` or `items[0].id`.    |

## Updating the plugin

From the cloned repository:

```bash
git pull
pnpm install
pnpm --filter dsh-tool-json build
```

Restart Harness with the same patch command after rebuilding.

## Troubleshooting

**The tools do not appear** usually means Harness was started without the patch file, or the patch file points to the wrong path. From the repository root, run `pwd` and confirm that the patch points to `packages/dsh-tool-json/dist/src/index.js` below that directory.

**The build fails** means dependencies may not be installed or the local Node.js version may be too old. Run `node --version`, then run `pnpm install` again.

## Development

Run the package quality gate from the repository root:

```bash
pnpm --filter dsh-tool-json format:check
pnpm --filter dsh-tool-json typecheck
pnpm --filter dsh-tool-json test
pnpm --filter dsh-tool-json build
```

The source is intentionally split into small modules:

```text
src/
  index.ts       # Harness entry point and tool registration
  json-utils.ts  # Parsing, formatting, validation, sorting, and path lookup

test/
  index.test.ts
  json-utils.test.ts
```

For the plugin model and patch overlay format, see the [official DeepSeek Harness plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).
