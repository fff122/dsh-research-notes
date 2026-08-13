import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { afterEach, describe, expect, it } from 'vitest'

import * as PromptPresetsPlugin from '../src/index.js'

describe('dsh-prompt-presets plugin mount', () => {
  const contexts: Context[] = []

  afterEach(async () => {
    await Promise.all(contexts.splice(0).map((ctx) => ctx.fiber.dispose()))
  })

  it('registers its four tools with a Harness context', async () => {
    const ctx = new Context()
    contexts.push(ctx)

    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(PromptPresetsPlugin)

    const tools = ctx as Context & { tools: ToolRuntime }
    const names = tools.tools
      .schemas()
      .map((schema) => schema.name)
      .sort()

    expect(names).toEqual(['preset_apply', 'preset_delete', 'preset_list', 'preset_save'])
  })
})
