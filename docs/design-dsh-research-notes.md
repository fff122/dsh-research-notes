# `dsh-research-notes` 设计方案

**状态：待评审；未开始实现代码。**

## 1. 目标与边界

`dsh-research-notes` 是一个面向 DeepSeek Harness 的本地研究笔记插件。它让 Agent 在研究过程中以结构化方式保存结论、来源 URL 和标签，并在需要时检索或导出这些笔记。

第一版只做**本地、工作区内、确定性**的数据管理。它不访问网络、不调用外部 API、不自动抓取网页、不使用向量数据库，也不修改 Harness 的会话历史。这样的边界可以降低权限需求和维护成本，并使全部核心逻辑可以离线测试。

> 设计原则：笔记必须由显式工具调用创建；每条记录可读、可追溯、可移植，且不会隐藏修改用户工作区中的其他文件。

## 2. 用户可见能力

| 工具名称               | 用途                                     | 必填参数           | 输出                                 |
| ---------------------- | ---------------------------------------- | ------------------ | ------------------------------------ |
| `research_note_save`   | 新建一条研究笔记                         | `title`、`content` | 笔记 ID、文件路径、创建时间          |
| `research_note_list`   | 按标签或关键词列出笔记摘要               | 无                 | 标题、标签、更新时间、路径组成的列表 |
| `research_note_search` | 在标题、正文、标签和来源中搜索           | `query`            | 匹配笔记及命中位置摘要               |
| `research_note_export` | 导出选定笔记或全部笔记为 Markdown 研究包 | 无                 | 导出文件路径、条目数                 |

`research_note_save` 的可选字段为：`source_url`、`source_title`、`tags`。标签在保存时将被规范化为小写、去重的短字符串。来源 URL 只存储为文本，不会因保存操作而发起网络请求。

## 3. 数据模型与文件布局

插件数据存放在当前工作区的 `.dsh/research-notes/` 目录中，避免污染项目源文件：

```text
.dsh/research-notes/
├── index.json
├── notes/
│   ├── 20260814T120000Z-abc123.md
│   └── 20260814T121500Z-def456.md
└── exports/
    └── research-notes-2026-08-14.md
```

每条笔记是可直接阅读的 Markdown 文件，头部使用 JSON 元数据块。`index.json` 只保存定位与筛选所需的摘要索引，可以由笔记文件重新构建；因此单个索引损坏不应导致研究内容丢失。

```json
{
  "id": "20260814T120000Z-abc123",
  "title": "插件接口结论",
  "content": "工具服务需要在 inject 中声明。",
  "source": {
    "url": "https://example.com/docs",
    "title": "官方文档"
  },
  "tags": ["dsh", "plugin"],
  "createdAt": "2026-08-14T12:00:00.000Z",
  "updatedAt": "2026-08-14T12:00:00.000Z"
}
```

## 4. 插件架构

插件采用官方推荐的函数模块形式：导出 `name`、`inject = ['tools']` 与 `apply(ctx)`。`apply(ctx)` 只负责向 `ctx.tools` 注册四个工具，业务逻辑保持在纯 TypeScript 模块中，以便不启动 Harness 也能测试。

| 模块                 | 职责                                             |
| -------------------- | ------------------------------------------------ |
| `src/index.ts`       | 插件入口；注册四个 Harness 工具                  |
| `src/note-store.ts`  | 创建目录、读取与写入 Markdown/索引、处理原子写入 |
| `src/note-search.ts` | 执行大小写不敏感的确定性文本匹配并构造摘要       |
| `src/note-export.ts` | 将笔记渲染为单一 Markdown 研究包                 |
| `src/schema.ts`      | 定义笔记、输入、输出和运行时校验类型             |
| `src/path-policy.ts` | 将数据路径限制在工作区 `.dsh/research-notes/` 下 |
| `test/`              | 单元、集成和挂载验证测试                         |

插件不在加载时创建文件夹。只有 `research_note_save` 或 `research_note_export` 被实际调用时，才会创建对应目录，以避免无操作时改变用户工作区。

## 5. Harness 工具定义

工具使用 `@deepseek-ai/dsh-tools` 的 `defineTool()` 注册。根据官方文档，`parameters` 描述输入并用于参数校验，`output.schema` 声明规范化返回值，`output.render` 将返回值转换为模型可见内容。[1]

四个工具均返回 JSON 兼容的规范化值，并提供简洁的文本渲染。写入类工具的返回内容必须包含绝对或相对文件路径，以便用户与 Agent 立即定位结果。

## 6. 错误处理与安全策略

插件将明确报错而不是静默吞掉问题：标题或内容为空、标签数量或长度超限、来源 URL 非法、索引损坏、文件写入失败、导出冲突都会返回可读错误。所有存储路径由 `path-policy.ts` 生成，禁止用户参数控制目标目录，从而避免路径遍历和对工作区其他文件的覆盖。

第一版将设置以下轻量限制：单条正文最多 50,000 字符；标签最多 20 个，每个最多 40 字符；搜索关键词不能为空。这些限制既避免异常大文件，也使结果保持可读。

## 7. 测试与发布门禁

在发布或推送实现代码前，必须通过以下全部检查：

| 检查层级         | 验证内容                                   | 通过标准                             |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| 格式与静态检查   | ESLint、Prettier、TypeScript 类型检查      | 命令零错误退出                       |
| 单元测试         | 标签规范化、路径策略、索引读写、搜索、导出 | 全部通过，覆盖正常与异常输入         |
| 文件系统集成测试 | 在临时工作区保存、列出、搜索、导出         | 不访问临时目录外文件；产物内容正确   |
| Harness 挂载测试 | 使用本地 `cordis.yml` patch 加载插件       | 日志确认插件加载；四个工具均注册成功 |
| 运行验证         | 实际调用保存、搜索、导出流程               | 返回结果与磁盘文件一致               |
| 发布前复核       | Git diff、依赖许可、README、测试报告       | 无未跟踪实现缺口或失败项             |

如果 Harness 版本、官方 API 或挂载命令发生变化，项目会先锁定可工作的版本；没有完成挂载验证，不会发布或推送实现代码。

## 8. 非目标与后续版本

以下能力不纳入第一版：自动网页抓取、浏览器自动化、跨设备同步、全文向量检索、用户账户、云存储、笔记删除/修改、自动来源可信度评分。它们会增加外部依赖、权限范围或数据一致性问题。

第二版的优先扩展是 `research_note_update`、`research_note_delete` 和从笔记文件重建索引。第三版才评估与网页搜索、PDF 阅读或引用台账插件的集成。

## 9. 验收示例

用户请求保存关于 Harness 插件开发的结论并附上官方文档 URL。Agent 调用 `research_note_save` 后，插件返回笔记 ID 与文件路径。随后用户请求搜索“工具注册”，`research_note_search` 应返回该笔记以及命中摘要。最后调用 `research_note_export`，生成一个按更新时间排序、带来源链接和标签的 Markdown 文件。

## 参考资料

[1]: [DeepSeek Harness — Build a tool](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)

[2]: [DeepSeek Harness — Your first plugin](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)

[3]: [DeepSeek Harness — Plugin architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
