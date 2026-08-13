# dsh-task-checklist

A local task checklist plugin for [DeepSeek Harness](https://deepseek.com/harness/en/). It lets an Agent create tasks, filter them by state or tag, mark work complete, and export a clean Markdown checklist.

All task data stays in the current working directory under `.dsh/task-checklist/tasks.json`. The plugin does not send task data over the network.

## Quick install

### Requirements

You need Node.js 22 or newer, `pnpm`, and a DeepSeek Harness installation that supports JavaScript or TypeScript plugins.

### Step 1: Download and build

Copy and run:

```bash
git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm --filter dsh-task-checklist build
```

### Step 2: Create the plugin configuration

Run this command from the repository root:

```bash
cat > packages/dsh-task-checklist/task-checklist.patch.yml <<EOF
- insert:
    - id: dsh-task-checklist
      name: '$PWD/packages/dsh-task-checklist/dist/src/index.js'
EOF
```

The plugin path is absolute because the Harness patch loader requires an absolute path.

### Step 3: Start Harness with the plugin

If Harness is installed as a command:

```bash
dsh web --patch "$PWD/packages/dsh-task-checklist/task-checklist.patch.yml"
```

Otherwise, run:

```bash
npx @deepseek-ai/dsh web --patch "$PWD/packages/dsh-task-checklist/task-checklist.patch.yml"
```

## Verify the installation

Ask the Agent:

```text
创建一个任务：准备周五的项目演示。标签用 work 和 demo，优先级为 high。
```

If the plugin is loaded, the Agent can use `task_create`. You can then ask it to list unfinished tasks, complete a task by id, or export a Markdown checklist.

## Available tools

| Tool                   | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `task_create`          | Create a task with a title and optional details, tags, and priority.          |
| `task_list`            | List tasks, optionally filtered by `todo` or `done` status and matching tags. |
| `task_complete`        | Mark a task complete using its id.                                            |
| `task_export_markdown` | Export matching tasks as a Markdown checklist.                                |

## Data and behavior

Each Harness working directory has its own checklist at `.dsh/task-checklist/tasks.json`. Writes are atomic, so an interrupted write cannot leave a partially written data file. Task identifiers are returned by `task_create` and `task_list`; use them with `task_complete`.

The tag filter is an **all tags** filter. For example, filtering by `work` and `demo` returns only tasks that have both tags.

## Updating the plugin

From the cloned repository:

```bash
git pull
pnpm install
pnpm --filter dsh-task-checklist build
```

Restart Harness with the same patch command after rebuilding.

## Development

Run the complete package quality gate from the repository root:

```bash
pnpm --filter dsh-task-checklist format:check
pnpm --filter dsh-task-checklist typecheck
pnpm --filter dsh-task-checklist test
pnpm --filter dsh-task-checklist build
```

The implementation is deliberately separated into small modules:

```text
src/
  index.ts        # Harness entry point and tool registration
  task-schema.ts  # Task types and input normalization
  task-store.ts   # Local persistence, filtering, completion, and export

test/
  index.test.ts
  mount.test.ts
  task-schema.test.ts
  task-store.test.ts
```

For the plugin model and patch overlay format, see the [official DeepSeek Harness plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).
