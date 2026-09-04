# tasks.md

按 Spec §57 的阶段推进。一次只做当前阶段；完成后勾选并写下验收证据。

产品名：Revision。平台：macOS ARM64。

## 文档与实现裁决

阶段 9 已把主要历史冲突回写到 PRD / Spec / Architecture，以下作为实现准则：

- 颜色、圆角、卡片、Titlebar、Revision 品牌标记（R / revision graph）、主界面信息层级以 Figma（https://www.figma.com/design/9gTShL5ZhiPRUMSiOoNN2P）和 PRD 为视觉基准。
- Figma 的 Light 稿是视觉基线；应用实际支持 Light / Dark / System，三套模式共享 `theme.ts` token contract。
- Titlebar 只放应用级 `Open working copy` / `Welcome screen` / Appearance；Refresh / Update / History 等 repository 级操作仍在内容区或 Sidebar。
- History 与 Working Copy 都是 Repository shell 里的 Sidebar page，不是独立顶层路由。
- Repository canonical state 使用 repository-scoped Zustand；App shell 与 transient diff request state 保留在各自 owner，不强行并入单一全局 Store。
- SVN 命令、parser、安全边界和 OperationManager 规则仍以 Spec / Architecture 为准。

> 阶段 2–8 下方的「偏差」是对应阶段完成时的历史验收快照；若与本节冲突，以本节和当前 docs 为准。

## 阶段 0 — 代理文档

- [x] `AGENTS.md`
- [x] `tasks.md`

## 阶段 1 — Bootstrap

验收：`bun run dev` 能打开窗口；Welcome 可见；检测得到系统 `svn`。

- [x] 锁定依赖：`bun`、`react`、`@gpuix/react@0.7.0`、`@gpuix/native@0.7.0`、TypeScript 5.8.3
- [x] `package.json` scripts：`dev` / `typecheck` / `test`
- [x] `tsconfig.json`：`jsxImportSource = @gpuix/react`
- [x] 入口 `render()` + 1440×960 窗口，标题 `Revision`，透明 titlebar
- [x] Figma 浅色 theme tokens（覆盖 Spec §46 Dark）
- [x] Welcome Screen（logo R、双卡片、Recent）
- [x] Changes / History 三栏视觉稿（fixture，`bun run dev:changes` / `dev:history`）
- [x] 启动时 `svn --version --quiet`；找不到时 Welcome 显示安装提示（Spec §10）
- [x] README 写明运行方式

## 阶段 2 — Repository

验收：能打开合法 working copy；非法目录报错且不进入主界面；Recent 可点。

- [x] `DirectoryPicker` + macOS `osascript` 实现
- [x] `CommandRunner`（argv、AbortSignal → kill）
- [x] `svn info --xml` + `infoParser` → `Repository`
- [x] Open Working Copy 流程
- [x] Recent（最多 10 条，失效路径标记，settings.json atomic write）
- [x] Repository shell：Sidebar + 空主区占位
- [x] Cmd+O

验收证据：`bun run typecheck` 与 `bun test` 30 通过（含 `file://` `svn info` 集成测、Welcome 打开失败 UI、live Repository placeholder）。

偏差：

- 按 Architecture 增加了 `src/application/`（Spec §3 目录树没有这一层）。
- 本阶段只实现 `CliSvnClient.getVersion` / `validateWorkingCopy`；其余 SvnClient 方法留给后续阶段。
- `classifySvnError` 先覆盖 `E155007` / `command-failed` / `aborted`，完整分类仍在阶段 9。
- App 状态留在 `App.tsx`，未引入 Zustand。
- 合法打开后主区是占位，不渲染阶段 1 的 fixture Changes/History（`dev:changes` / `dev:history` 仍走 fixture）。

## 阶段 3 — Status

验收：打开后看到 Changed Files；Refresh 更新列表；默认隐藏 ignored/external/normal。

- [x] `svn status --xml --ignore-externals` + `statusParser`
- [x] 默认 checkbox 规则 + refresh 时 selection reconcile
- [x] Changes Pane + `<virtual-list>` 行（checkbox 与 row select 分离）
- [x] Sidebar Update Card 的 revision / 状态
- [x] 文件操作后与手动 Refresh 都走 `refreshGeneration`

验收证据：`bun run typecheck` 与 `bun test` 41 通过（含 `statusParser`、checkbox reconcile、`file://` `svn status` 集成测、live Changes 列表、Refresh 再拉 status）。

偏差：

- Theme / Sidebar / Changes / Diff chrome 按 Figma 浅色稿更新（`#F8F9FB` / `#3363F2` / 软色 status badge）；Diff 内容仍是阶段 4。
- 合法打开后渲染真实 Changes Pane，不再用阶段 2 的空主区占位。
- Sidebar 状态文案用本地变更数（`N local changes` / `Up to date`），没有跑 `svn status -u`。
- `checkedPaths` 仍在 `RepositoryScreen` 的 React state，未引入 Zustand。
- Commit / Update / Revert 仍是视觉控件，mutation 留给阶段 5–6。

## 阶段 4 — Diff

验收：点文件立即 Loading；文本文件出 unified diff；快速切换不串台。

- [x] `svn diff --git -- PATH` + AbortController
- [x] `DiffResult`：text / binary / unversioned
- [x] `<diff>` 独立 pane
- [x] unversioned / binary 空态 + Add 入口
- [x] mutation 后清空 diff cache

验收证据：`bun run typecheck` 与 `bun test` 54 通过（含 `classifyDiffOutput`、requestId 丢弃旧结果、`file://` `svn diff` 区分 text/binary/unversioned、live Loading / 快速切换不串台、unversioned Add 入口）。

偏差：

- Changes 行改为 `width: 100%` 的 `ChangeRow`（去掉 hug 宽度 + 水平 margin），长路径 ellipsis，选中高亮拉满 Figma 376px 卡片。
- `SvnClient.getDiff` 按 Spec §22 返回 `DiffResult`，不是裸 `string`。
- unversioned 在 `loadFileDiff` 短接，不跑 `svn diff`。
- Diff cache 是 `RepositoryScreen` 里的 `Map`，Refresh 成功后清空；真正的 Add mutation 仍留在阶段 6，本阶段只放 Add 按钮入口。
- `<diff scroll>` 作为 Diff pane 的唯一纵向滚动。

## 阶段 5 — Commit

验收：勾选 + 非空 message 才能提交；成功清 message/selection 并 refresh；失败保留输入。

- [x] Commit composer 在 Changes Pane 底部（不是窗口底栏）
- [x] `svn commit PATHS -m MESSAGE --non-interactive`
- [x] 解析 `Committed revision N.`
- [x] Cmd+Enter
- [x] mutation lock：提交中禁用 Commit / Update / Revert / Add / Delete

验收证据：`bun run typecheck` 与 `bun test` 80 通过（含 `parseCommitRevision`、空 message 禁用、成功清空 message/selection 并 refresh、失败保留输入、提交中显示 Committing…、`file://` add+commit 集成测）。

## 阶段 6 — Mutations

验收：Update / Add / Delete / Revert 可用；破坏性操作有确认；同时只有一个 mutation。

- [x] Update（Sidebar card，`svn update --non-interactive`，流式输出一行即可）
- [x] Add unversioned（`--parents`）
- [x] Delete versioned（确认）；Missing → `svn delete --force`
- [x] Revert selected（确认；不做目录递归 revert）
- [x] `OperationManager` 串行 mutation

验收证据：`OperationManager` 单测拒绝并发 mutation；Revert 确认框 Cancel 不执行；`file://` 集成覆盖 add / commit / revert / missing delete --force / update。

## 阶段 7 — Checkout

验收：Checkout 成功后自动打开；失败展示 stderr。

- [x] Checkout Dialog（URL + Destination）
- [x] `svn checkout URL DEST --non-interactive` 流式输出
- [x] Cmd+Shift+O
- [x] 认证失败文案（不内置登录 UI）

验收证据：Welcome 打开 Checkout Dialog；失败展示 stderr；认证失败文案走 `classifySvnError`；`file://` checkout 成功后写入 Recent 并打开 working copy。Cmd+Shift+O / Esc 有快捷键单测。

偏差：

- commit argv 为 `svn commit --non-interactive -m MESSAGE -- PATHS`（Spec 示例没有 `--`，按 AGENTS.md 用 `--` 分隔路径）。
- Diff header 用 Delete 按钮替代 Figma 的 `⋯`；Sidebar「More SVN actions」改成「Delete selected」。
- 目录 `nodeKind === 'dir'` 不提供 revert（MVP 不做递归 revert）。
- Checkout Dialog 按 PRD §8 做成 URL + Destination 模态框，不是 Figma Welcome 底部那张预览卡。
- `CommandRunner` 增加 `onStdout`，供 update / checkout 显示当前输出行。
- mutation lock 与 checkout 共用同一个 `OperationManager`（挂在 AppServices）。
- App 状态仍在 React state，未引入 Zustand。

## 阶段 8 — History

验收：Sidebar 切到 History；默认 100 条；点 revision 看详情。MVP 不做 revision diff。

- [x] `svn log --xml -v -l 100` + `logParser`
- [x] Revision List + Revision Detail
- [x] History Refresh

验收证据：`bun run typecheck` 与 `bun test` 92 通过（含 logParser：empty message / unicode author / multi-line / copyfrom；live History 加载与点选详情；`file://` `svn log` 集成测）。

偏差：

- log argv 用 `svn log --xml -v -l 100 -r HEAD:1 -- .`：目标是当前 working copy 的 URL，不是仓库根 `^/`。`-r HEAD:1` 避免 mixed-revision WC 默认 BASE:1 漏掉刚提交的 revision。
- 未做 My commits / This branch filter chips（没有当前用户与 branch 模型）。
- 未做 revision diff（按 PRD MVP）。
- Sidebar 工作区切换器只切换 Recent。`Open working copy` / `Welcome screen` 在 Titlebar。
- 系统文件夹选择器取消（含中文「用户已取消」/ AppleEvent -128）返回 null，不抛错、不崩溃。

## 阶段 9 — Polish

验收：PRD §32 DoD 全部勾上；最终命令需在 macOS ARM64 + GPUIX native renderer 环境执行。

- [x] 快捷键补齐（Cmd+R、Esc）
- [x] 空态 / Error Banner（含折叠的 Show Details）
- [x] `classifySvnError`：not-working-copy / auth / locked / network / conflict / fallback
- [x] Working Copy 页面：Local checkout / Repository / Status 概览 + Refresh / Update
- [x] `Show in Finder` 放在 Working Copy 的 Local path 旁（打开仓库根）；Sidebar Quick action 改为当前文件 `Reveal in Finder`；Diff 顶栏去掉空图标按钮
- [x] 核心 parser 单测 + `file://` 集成测
- [x] 关键界面 screenshot smoke：Welcome / Changes / History / Working Copy
- [x] 至少一条 MVP vertical happy path：checkout → status → diff → commit → clean → history
- [x] Revision 应用图标：沿用 `#3363F2` / 圆角视觉，R 融合 revision graph 节点语义；Welcome 与 app bundle 共用同一品牌源
- [x] unsigned 构建：`bun run build` 生成 standalone binary；macOS 同时生成带 `AppIcon.icns` 的 `Revision.app`，`bun run build:bin` 保留裸 binary 构建
- [ ] macOS ARM64 本机最终验收：`bun run typecheck && bun test && bun run build`

阶段 9 新增验收覆盖：

- `tests/unit/shortcuts.test.ts`：Cmd+R。
- `tests/unit/error.test.ts`：locked / network / conflict / fallback。
- `tests/ui/errorBanner.test.tsx`：Show Details 折叠/展开。
- `tests/ui/workingCopy.test.tsx`：Working Copy 信息与 status summary。
- `tests/ui/welcome.test.tsx`：Revision brand mark 出现在 Welcome。
- `tests/ui/screenshots.test.tsx`：核心页面 GPU screenshot smoke。
- `tests/integration/happyPath.test.ts`：真实 `svnadmin` / `file://` vertical happy path。

当前远程工具环境不能运行 macOS GPUIX native renderer，也未宣称上述最终命令已经通过；最后一项保留为本机验收门槛。

## 禁止插入的工作

未改 PRD/Spec 之前不要做：Git、凭据存储、冲突编辑器、branch/tag、filesystem watcher、Windows、Rust SVN 库、路由库、遥测。
