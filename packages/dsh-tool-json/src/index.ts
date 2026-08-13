import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type ToolRuntime from '@deepseek-ai/dsh-tools'

import {
  formatJson,
  jsonType,
  parseJson,
  queryJson,
  type FormatOptions,
  validateJson,
} from './json-utils.js'

export const name = 'dsh-tool-json'
export const inject = ['tools']

type HarnessContext = Context & { tools: ToolRuntime }

export function apply(ctx: HarnessContext): void {
  for (const tool of createToolDefinitions()) {
    ctx.tools.register(tool)
  }
}

export function createToolDefinitions(): ToolDefinition[] {
  return [
    defineTool({
      name: 'json_format',
      description: 'Format a JSON string with optional indentation and sorted object keys.',
      parameters: {
        json: { type: 'string', required: true, description: 'The JSON text to format.' },
        indent: {
          type: 'integer',
          description: 'Spaces per indentation level, from 0 to 10. Defaults to 2.',
        },
        sortKeys: {
          type: 'boolean',
          description: 'Sort object keys recursively before formatting.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            formatted: { type: 'string', required: true },
            characters: { type: 'integer', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        const options: FormatOptions = {}
        if (args.indent !== undefined) options.indent = args.indent
        if (args.sortKeys !== undefined) options.sortKeys = args.sortKeys

        const formatted = formatJson(args.json, options)
        return { formatted, characters: formatted.length }
      },
    }),

    defineTool({
      name: 'json_validate',
      description:
        'Check whether a string is valid JSON and return a readable error when it is not.',
      parameters: {
        json: { type: 'string', required: true, description: 'The JSON text to validate.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            valid: { type: 'boolean', required: true },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        return validateJson(args.json)
      },
    }),

    defineTool({
      name: 'json_query',
      description: 'Read a value from JSON using a simple path such as user.name or items[0].id.',
      parameters: {
        json: { type: 'string', required: true, description: 'The JSON text to query.' },
        path: {
          type: 'string',
          required: true,
          description: 'A path such as $.user.name, user.name, or items[0].id.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string', required: true },
            type: { type: 'string', required: true },
            value: { type: 'string', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatToolOutput(value) }],
      },
      async execute(args, _exec: ToolRunContext) {
        const value = queryJson(parseJson(args.json), args.path)
        return {
          path: args.path,
          type: jsonType(value),
          value: JSON.stringify(value),
        }
      },
    }),
  ]
}

function formatToolOutput(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
