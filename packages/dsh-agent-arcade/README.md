# dsh-agent-arcade

A small deterministic Snake game for [DeepSeek Harness](https://deepseek.com/harness/en/). The Agent chooses a direction on every turn, while the user can watch the ASCII board, score, status, and reasoning returned by each step.

The game runs entirely in memory. It does not use the network, save files, or execute shell commands. A fixed seed makes food placement and a replayed sequence reproducible.

## Quick install

### Requirements

You need Node.js 22 or newer, `pnpm`, and a DeepSeek Harness installation that supports JavaScript or TypeScript plugins.

### Step 1: Download and build

Copy and run:

```bash
git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm --filter dsh-agent-arcade build
```

### Step 2: Create the plugin configuration

Run this command from the repository root:

```bash
cat > packages/dsh-agent-arcade/agent-arcade.patch.yml <<EOF
- insert:
    - id: dsh-agent-arcade
      name: '$PWD/packages/dsh-agent-arcade/dist/src/index.js'
EOF
```

The plugin path is absolute because the Harness patch loader requires an absolute path.

### Step 3: Start Harness with the plugin

If Harness is installed as a command:

```bash
dsh web --patch "$PWD/packages/dsh-agent-arcade/agent-arcade.patch.yml"
```

Otherwise, run:

```bash
npx @deepseek-ai/dsh web --patch "$PWD/packages/dsh-agent-arcade/agent-arcade.patch.yml"
```

## Verify the installation

Ask the Agent:

```text
开始一局 12×8 的贪吃蛇，随机种子用 42。每一步都告诉我棋盘、分数和你的决策理由。
```

The Agent should call `arcade_snake_new`, then alternate `arcade_snake_step` and `arcade_snake_render`. Ask for `arcade_snake_history` at any time to review the full sequence of decisions.

## Available tools

| Tool                   | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `arcade_snake_new`     | Start or restart a deterministic game with optional width, height, and seed. |
| `arcade_snake_step`    | Let the Agent choose a safe direction toward food and advance one turn.      |
| `arcade_snake_render`  | Return the current board as ASCII art with score and status.                 |
| `arcade_snake_history` | Return every turn, direction, reason, position, score, and outcome.          |

## Board and replay rules

The board dimensions range from 5 to 30 cells in each direction. The default board is 12 by 8, and the default seed is 1. The snake starts in the center heading right. `H` marks the head, `o` marks the body, and `*` marks the food.

The Agent uses a simple deterministic policy: it compares legal directions by Manhattan distance to the food, then applies a stable tie-break order. The policy is intentionally easy to read and modify; it is not intended to be a competitive game-playing algorithm.

To reproduce a run, call `arcade_snake_new` with the same dimensions and seed, then replay the same manual directions. A game ends when the snake hits a wall or itself, or when the board is filled.

## Updating the plugin

From the cloned repository:

```bash
git pull
pnpm install
pnpm --filter dsh-agent-arcade build
```

Restart Harness with the same patch command after rebuilding.

## Development

Run the complete package quality gate from the repository root:

```bash
pnpm --filter dsh-agent-arcade format:check
pnpm --filter dsh-agent-arcade typecheck
pnpm --filter dsh-agent-arcade test
pnpm --filter dsh-agent-arcade build
```

The implementation is split into small modules:

```text
src/
  index.ts       # Harness entry point and tool registration
  snake-game.ts  # Deterministic game rules, policy, rendering, and history

test/
  index.test.ts
  mount.test.ts
  snake-game.test.ts
```

For the plugin model and patch overlay format, see the [official DeepSeek Harness plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).
