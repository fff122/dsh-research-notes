# dsh-prompt-presets

A local prompt preset plugin for [DeepSeek Harness](https://deepseek.com/harness/en/). It stores reusable prompt templates, supports `{{variable}}` placeholders, and renders a finished prompt when the Agent supplies values.

Preset data stays in the current working directory under `.dsh/prompt-presets/presets.json`. The plugin does not send templates or variables over the network.

## Quick install

### Requirements

You need Node.js 22 or newer, `pnpm`, and a DeepSeek Harness installation that supports JavaScript or TypeScript plugins.

### Step 1: Download and build

Copy and run:

```bash
git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm --filter dsh-prompt-presets build
```

### Step 2: Create the plugin configuration

Run this command from the repository root:

```bash
cat > packages/dsh-prompt-presets/prompt-presets.patch.yml <<EOF
- insert:
    - id: dsh-prompt-presets
      name: '$PWD/packages/dsh-prompt-presets/dist/src/index.js'
EOF
```

The plugin path is absolute because the Harness patch loader requires an absolute path.

### Step 3: Start Harness with the plugin

If Harness is installed as a command:

```bash
dsh web --patch "$PWD/packages/dsh-prompt-presets/prompt-presets.patch.yml"
```

Otherwise, run:

```bash
npx @deepseek-ai/dsh web --patch "$PWD/packages/dsh-prompt-presets/prompt-presets.patch.yml"
```

## Verify the installation

Ask the Agent:

```text
保存一个名为 meeting-summary 的提示词模板：总结 {{topic}}，面向 {{audience}}，语气保持简洁。标签用 work。
```

Then ask:

```text
应用 meeting-summary，topic 是产品发布会，audience 是工程团队。
```

If the plugin is loaded, the Agent can use `preset_save` and `preset_apply` to save and render the template.

## Available tools

| Tool            | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `preset_save`   | Save a new preset or update an existing preset with the same name. |
| `preset_list`   | List saved presets, optionally filtered by tags.                   |
| `preset_apply`  | Replace `{{variable}}` placeholders with supplied values.          |
| `preset_delete` | Delete a preset by name.                                           |

## Template behavior

Variable names use letters, digits, and underscores, and must start with a letter or underscore. Spaces inside braces are allowed, so `{{topic}}` and `{{ topic }}` refer to the same variable. Variables are returned in first-seen order.

If a variable is missing, `preset_apply` leaves its placeholder in the rendered text and lists the name in `missing`. This makes it possible to review an incomplete prompt without losing the original placeholder.

Strings are inserted as-is. Numbers and booleans use their text form, while arrays and objects are inserted as compact JSON.

## Updating the plugin

From the cloned repository:

```bash
git pull
pnpm install
pnpm --filter dsh-prompt-presets build
```

Restart Harness with the same patch command after rebuilding.

## Development

Run the complete package quality gate from the repository root:

```bash
pnpm --filter dsh-prompt-presets format:check
pnpm --filter dsh-prompt-presets typecheck
pnpm --filter dsh-prompt-presets test
pnpm --filter dsh-prompt-presets build
```

The implementation is split into small modules:

```text
src/
  index.ts          # Harness entry point and tool registration
  preset-schema.ts  # Preset types, validation, and template rendering
  preset-store.ts   # Local persistence, filtering, updating, and deletion

test/
  index.test.ts
  mount.test.ts
  preset-schema.test.ts
  preset-store.test.ts
```

For the plugin model and patch overlay format, see the [official DeepSeek Harness plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).
