# dsh-research-notes

A small local note-taking plugin for [DeepSeek Harness](https://deepseek.com/harness/en/). It gives an Agent four tools for saving, listing, searching, and exporting research notes.

The plugin stores human-readable Markdown files under `.dsh/research-notes/` in the current workspace. It does not need a database, external API, browser permission, or network service.

## Quick install

### Requirements

You need:

- Node.js 22 or newer
- `pnpm`
- DeepSeek Harness with support for JavaScript or TypeScript plugins

### Step 1: Download and build

Copy and run these commands:

```bash
git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm build
```

### Step 2: Create the Harness plugin configuration

Run this command in the plugin directory:

```bash
cat > research-notes.patch.yml <<EOF
- insert:
    - id: dsh-research-notes
      name: '$PWD/dist/src/index.js'
EOF
```

The generated path is absolute, which is required by the Harness patch loader.

### Step 3: Start Harness with the plugin

If Harness is available as a command, run:

```bash
dsh web --patch "$PWD/research-notes.patch.yml"
```

If it is not installed as a command, run:

```bash
npx @deepseek-ai/dsh web --patch "$PWD/research-notes.patch.yml"
```

Open the Harness Web UI shown by the command. The Agent can now use the four research-note tools.

## Other DeepSeek Harness plugins

The following plugins are maintained in separate public repositories:

| Plugin               | Repository                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| `dsh-task-checklist` | [fff122/dsh-task-checklist](https://github.com/fff122/dsh-task-checklist) |
| `dsh-prompt-presets` | [fff122/dsh-prompt-presets](https://github.com/fff122/dsh-prompt-presets) |
| `dsh-agent-arcade`   | [fff122/dsh-agent-arcade](https://github.com/fff122/dsh-agent-arcade)     |

## Verify the installation

Ask the Agent to save a note, for example:

```text
保存一条研究笔记：标题是 DeepSeek Harness，正文是这是一次安装测试，标签是 test。
```

The note should appear under:

```text
.dsh/research-notes/notes/
```

You can also ask the Agent to list, search, or export the note. If the tools do not appear, check that the patch file points to `dist/src/index.js` and that `pnpm build` completed successfully.

## Available tools

| Tool                   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `research_note_save`   | Save a note with an optional source URL and tags.               |
| `research_note_list`   | List notes, optionally filtered by tag.                         |
| `research_note_search` | Search note titles, bodies, sources, and tags.                  |
| `research_note_export` | Export selected notes or all notes to a Markdown research pack. |

## One-copy installation

After cloning the repository, the following block installs, builds, configures, and starts the plugin:

```bash
set -e

git clone https://github.com/fff122/dsh-research-notes.git
cd dsh-research-notes
pnpm install
pnpm build

cat > research-notes.patch.yml <<EOF
- insert:
    - id: dsh-research-notes
      name: '$PWD/dist/src/index.js'
EOF

npx @deepseek-ai/dsh web --patch "$PWD/research-notes.patch.yml"
```

## Where notes are stored

```text
.dsh/research-notes/
  notes/<note-id>.md
  index.json
  exports/research-notes-<timestamp>.md
```

The Markdown files are the source of truth. They can be opened, edited, copied, or backed up by hand. The plugin only writes below the current workspace's `.dsh/research-notes/` directory.

## Updating the plugin

From the cloned directory, run:

```bash
git pull
pnpm install
pnpm build
```

Then restart Harness with the same patch command.

## Troubleshooting

**`pnpm: command not found`** means that pnpm is not installed. Install pnpm using the official [pnpm installation guide](https://pnpm.io/installation), then repeat the commands.

**The tools do not appear** usually means that Harness was started without the patch file, or that the patch file still points to the wrong path. Run `pwd` inside the cloned directory and confirm that the patch points to the resulting absolute path followed by `/dist/src/index.js`.

**The build fails** means that the local Node.js or pnpm version may not meet the requirements, or that dependencies were not installed. Run `node --version`, then run `pnpm install` again.

## Development

The repository uses strict TypeScript and Vitest. Before committing changes, run the complete quality gate:

```bash
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

The source is intentionally split into small modules so that another developer can understand and modify it:

```text
src/
  index.ts        # Harness entry point and tool registration
  schema.ts       # Input validation and shared data types
  note-format.ts  # Human-readable Markdown serialization
  note-store.ts   # Filesystem persistence and search
  path-policy.ts  # Workspace boundary and path safety

test/
  schema.test.ts
  note-format.test.ts
  note-store.test.ts
```

No release or GitHub publication should happen until formatting, type checking, tests, and the production build all pass. The repository is public and tagged with the `dsh-plugin` GitHub topic.

For the plugin model and patch overlay format, see the [official DeepSeek Harness plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).
