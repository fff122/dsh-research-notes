# dsh-research-notes

`dsh-research-notes` is a small local note-taking plugin for DeepSeek Harness. It gives an Agent four tools for saving, listing, searching, and exporting research notes without requiring a database, network service, or browser permission.

The plugin stores human-readable Markdown files under `.dsh/research-notes/` in the current workspace. The files are intentionally simple so that a person can open, edit, copy, or back them up without this plugin.

## Features

The plugin registers these tools:

| Tool                   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `research_note_save`   | Save a note with an optional source URL and tags.               |
| `research_note_list`   | List note summaries, optionally filtered by tag.                |
| `research_note_search` | Search note title, body, source, and tags.                      |
| `research_note_export` | Export selected notes or all notes to a Markdown research pack. |

The first version deliberately does not fetch webpages, call external APIs, or run shell commands. This keeps the permission boundary small and makes the stored data easy to inspect.

## Requirements

- Node.js 22 or newer
- A DeepSeek Harness installation compatible with `@deepseek-ai/dsh-tools` 0.1.0-rc.5 or newer
- A Harness plugin loader that supports a TypeScript/JavaScript module exporting `apply(ctx)`

The package uses `@deepseek-ai/dsh-tools` and `@deepseek-ai/cordis` as runtime peer dependencies. Harness supplies these packages at runtime.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

The project keeps tests next to a small number of focused modules:

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

## Local Harness loading

For a local source checkout, point the Harness plugin loader at the repository entry point or use a Cordis patch overlay supported by your Harness version. The module entry is:

```text
./dist/src/index.js
```

The plugin exports:

```ts
export const name = 'dsh-research-notes'
export const inject = ['tools']
export function apply(ctx: Context): void
```

The exact `cordis.yml` shape depends on the Harness release and loader profile. Keep the repository source path or the built package path in the profile; do not copy `.dsh/research-notes/` into the plugin package.

## Data layout

```text
.dsh/research-notes/
  notes/<note-id>.md
  index.json
  exports/research-notes-<timestamp>.md
```

Each note is a Markdown file with a JSON front matter block. The format is intentionally explicit and can be edited by hand. The index is a derived summary used to make list and search operations fast; the note files remain the source of truth.

The plugin only writes below the current workspace's `.dsh/research-notes/` directory. Note IDs are validated before they become filenames, and writes use a temporary file followed by a rename.

## Publishing gate

No release or GitHub publication should happen until all of these checks pass:

```bash
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

The repository is tagged with the `dsh-plugin` GitHub topic so that it can be discovered alongside other Harness plugins.
