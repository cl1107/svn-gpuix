# AGENTS.md

macOS ARM64 上的轻量 SVN GUI（产品名 **Revision**）。UI 是 GPUIX + React + TypeScript，运行时是 Bun，SVN backend 只有系统 `svn` CLI。

当前仓库从文档起步。实现任何功能前先读对应文档，再写最小切片。

## 先读哪份文档

| 场景 | 读 |
| --- | --- |
| 产品范围、主界面、Welcome、快捷键、DoD | [docs/PRD.md](docs/PRD.md) |
| SVN 命令、argv、parser、Store、错误分类、实现顺序 | [docs/Spec.md](docs/Spec.md) |
| 分层、OperationManager、cancellation、测试金字塔 | [docs/ArchitectureDesign.md](docs/ArchitectureDesign.md) |
| 阶段清单与完成状态 | [tasks.md](tasks.md) |
| 视觉还原、间距、颜色、组件外观 | [Figma 设计稿](https://www.figma.com/design/9gTShL5ZhiPRUMSiOoNN2P/gpuix-SVN-Client-%E2%80%94-Modern-Desktop-UI?node-id=0-1) |
| GPUIX API、元素、样式、测试 renderer、打包 | https://gpuix.dev/ （本地可 `curl -L https://gpuix.dev/docs.zip`） |

**文档冲突时的优先级：** 视觉层级以 Figma 的 Light 稿为基准，信息架构以 PRD 为准；SVN 命令与数据契约以 Spec 为准；代码放哪一层以 Architecture 为准。应用支持 Light / Dark / System，Dark/System 是同一 token contract 的正式变体，不再把 Spec 理解成“只做 Dark”。阶段 9 已将主要历史冲突回写到 docs，剩余裁决记在 `tasks.md`。

实现或改 UI 前优先用 Figma MCP（`https://mcp.figma.com/mcp`）拉当前节点的标注与截图。若 MCP 不可用或触发账户额度限制，按 PRD 的布局数字、现有 theme/component contract 和仓库已有 screenshot 继续，不另起一套视觉语言。

## 每个任务怎么做

1. 读 PRD / Spec / Architecture 中与本切片相关的章节，写出验收条件。
2. 只实现当前 `tasks.md` 阶段里的最小垂直切片。
3. 测试跟着切片走：parser / domain / application 用单测；SVN 命令用本地 `file://` 仓库集成测；关键界面用 GPUIX GPU test renderer。
4. 跑 `bun run typecheck` 和本次相关的 `bun test`。
5. 完成后把 `tasks.md` 对应项标为完成，并记下偏差。

## 分层

```
Presentation (React + @gpuix/react)
        ↓
Application (use cases, OperationManager, refresh)
        ↓
Domain (types, 纯函数)
        ↑
Infrastructure implements interfaces (SvnClient, CommandRunner, picker, settings)
```

业务组件只 import `@gpuix/react`。自定义 native 能力放 `src/platform/`。禁止在组件里 `Bun.spawn`，禁止 parser 写 Store。

目录以 Spec §3 为准，实现时按该树落文件。

## SVN

- 所有 process 走 `CommandRunner`：`argv` 数组、`shell = false`。路径用 `--` 分隔。
- 结构化输出用 XML（`status` / `info` / `log`）+ `fast-xml-parser`。XML 不得离开 Infrastructure。
- 远程操作带 `--non-interactive`。不写 `--username` / `--password`，不加 `--trust-server-cert`。
- mutation（checkout / commit / update / revert / add / delete）同一时刻只能一个，走 `OperationManager`。成功后 refresh status + info，并清空 diff cache。
- 读操作可并发。Diff 必须用 `AbortSignal` + `requestId`，旧结果不得覆盖新选择。
- UI 展示相对路径；命令 `cwd` 是 working copy root。
- Revert / Delete 在 Application 调用前由 UI 确认。Infrastructure 不弹窗。
- MVP 不 watch 文件系统。

## GPUIX

官方文档：https://gpuix.dev/

- 入口文件以 `render()` 结尾；开发用 `bun --hot`。不要在入口里 `createRenderer()` / `init()`。
- `tsconfig` 必须 `"jsx": "react-jsx"` 且 `"jsxImportSource": "@gpuix/react"`。
- 锁定 `@gpuix/react` / `@gpuix/native` 精确版本。升级单独做。
- GPUI **不继承** `color`：每个 `<text>` 和 `<svg>` 自己设颜色，否则深色底上看不见。
- 长列表用 `<virtual-list>`；unified diff 用 `<diff patch={...} wordDiff>`，不要把 patch 拆成 React 行。
- **禁止嵌套纵向滚动**。Changes 列表、Diff、History 列表、Revision Detail 是并列 pane，各自至多一个 scroller。
- Dialog 用 `<anchored>`；破坏性确认时 outside click / Esc = 取消。
- 主题 token 集中在 `src/app/theme.ts`。应用支持 Light / Dark / System；live UI 从 `ThemeProvider` 读取 token，GPUIX `<diff>` 的 appearance 必须跟随 resolved theme。
- 测试：`createTestRoot` / `@gpuix/react/testing`；断言优先读 `testId` 文本，screenshot 做回归。

## 明确不做

Git、Electron/Tauri/webview、router 库、凭据存储、冲突编辑器、branch/tag、merge、lock、blame、changelist、多 working copy 同窗口、插件、遥测、Windows 适配、自行实现 SVN library。

完整非目标见 PRD §3 与 Spec §58。需求文档未改之前不要做。

## 完成一条代码的最低标准

- typecheck 通过
- 相关单测 / 集成测通过
- 没有 shell 字符串拼接命令
- 没有持久化凭据
- 没有在 render 路径上同步阻塞 SVN
