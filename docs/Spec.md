# Revision — Technical Specification

**Version:** 0.2  
**Status:** Implementation-aligned  
**Last updated:** 2026-09-02  
**Platform:** macOS ARM64  
**Frontend:** React on GPUIX  
**Runtime:** Bun  
**Language:** TypeScript  
**SVN integration:** System CLI

---

# 1. Purpose

本文档描述 Revision 当前初版的实际技术实现，并作为后续 Codex / agent 修改代码时的基准。

优先级：

```text
Current code
> this Spec
> PRD
> historical implementation notes
```

若本文档与旧 ArchitectureDesign.md 或 tasks.md 中的历史描述冲突，以当前代码和本文档为准。

---

# 2. Runtime & Dependencies

`package.json` 当前锁定：

- `@gpuix/react@0.7.0`
- `@gpuix/native@0.7.0`
- React 19
- TypeScript 5.8.3
- Bun
- `fast-xml-parser`

Scripts：

```bash
bun run dev
bun run dev:welcome
bun run dev:changes
bun run dev:history
bun run typecheck
bun test
bun run build
```

Build：

```bash
bun build --compile src/main.tsx --outfile dist/revision
```

---

# 3. Current Source Layout

```text
src/
  app/
    App.tsx
    Titlebar.tsx
    services.ts
    shortcuts.ts
    theme.ts

  application/
    checkoutRepository.ts
    commitChanges.ts
    errors.ts
    loadDiff.ts
    loadHistory.ts
    mutateWorkingCopy.ts
    openRepository.ts
    operationManager.ts
    refreshRepository.ts

  components/
    Button.tsx
    Checkbox.tsx
    Dialog.tsx
    ErrorBanner.tsx
    StatusBadge.tsx

  design/
    fixtures.ts

  domain/
    change.ts
    diff.ts
    error.ts
    operation.ts
    repository.ts
    revision.ts

  features/
    changes/
      ChangeRow.tsx
      ChangesPanel.tsx
      DiffPanel.tsx
    history/
      HistoryView.tsx
    repository/
      RepositoryScreen.tsx
      Sidebar.tsx
    welcome/
      CheckoutDialog.tsx
      WelcomeScreen.tsx
      recentItems.ts

  services/
    picker/
    settings/
    svn/

  main.tsx
```

当前没有 Zustand、router 或 Rust backend。

App / feature local state 使用 React state；业务流程集中在 application 层；SVN 细节集中在 services/svn。

---

# 4. Architectural Responsibilities

## 4.1 app

负责：

- 应用启动；
- 顶层 Welcome / Repository 状态；
- service wiring；
- titlebar；
- 全局快捷键；
- theme。

## 4.2 application

负责 use case orchestration：

- open repository；
- checkout；
- refresh；
- diff request；
- commit；
- update/add/delete/revert；
- history load；
- mutation serialization。

这里允许组合多个 domain/service，但不直接写 UI。

## 4.3 domain

纯模型与规则：

- SVN change status；
- default selection；
- committable/addable/revertable/deletable；
- repository model；
- revision model；
- error model；
- operation result。

尽量保持无 UI / 无 process dependency，便于单元测试。

## 4.4 services

外部系统适配：

- system SVN CLI；
- XML parser；
- macOS directory picker；
- settings.json。

## 4.5 features

页面和交互组件：

- Welcome；
- Repository shell；
- Changes；
- Diff；
- History。

---

# 5. App Navigation Model

顶层不使用路由库。

概念模型：

```ts
type AppView =
  | { kind: 'welcome' }
  | { kind: 'repository'; repository: Repository }
```

Repository 内：

```ts
type RepositoryPage =
  | 'changes'
  | 'history'
  | 'working-copy'
```

History 不应重新做成独立 window / top-level route。

`working-copy` 当前只允许保留占位；若新增真实功能，应作为独立需求实现。

---

# 6. SVN Client Contract

当前 `CliSvnClient` 提供：

```ts
getVersion(signal?): Promise<string>

validateWorkingCopy(path, signal?): Promise<Repository>

getStatus(path, signal?): Promise<WorkingCopyChange[]>

getDiff(rootPath, path, signal?): Promise<DiffResult>

commit(rootPath, paths, message, signal?): Promise<CommitResult>

add(rootPath, paths, signal?): Promise<void>

delete(rootPath, paths, options?): Promise<void>

revert(rootPath, paths, signal?): Promise<void>

update(rootPath, options?): Promise<UpdateResult>

checkout({ url, destination, signal?, onStdout? }): Promise<Repository>

getLog(rootPath, options?): Promise<SvnRevision[]>
```

UI 不应自行拼 SVN argv。

---

# 7. CommandRunner

所有 CLI 调用必须通过 `CommandRunner`。

要求：

- argv array，不拼 shell command string；
- cwd 显式传入；
- 支持 AbortSignal；
- abort 时终止子进程；
- 捕获 stdout / stderr / exitCode；
- network/write 长操作可通过 `onStdout` 流式更新 UI；
- 路径参数前使用 `--`，避免以 `-` 开头的路径被误识别为参数。

新增 SVN 命令必须延续该模式。

---

# 8. SVN Commands

## 8.1 Version

```bash
svn --version --quiet
```

## 8.2 Info

```bash
svn info --xml
```

解析为：

```ts
interface Repository {
  rootPath: string
  repositoryUrl: string
  repositoryRoot: string
  uuid?: string
  revision: number
}
```

## 8.3 Status

```bash
svn status --xml --ignore-externals
```

输出通过 XML parser 转为 `WorkingCopyChange[]`。

## 8.4 Diff

```bash
svn diff --git -- PATH
```

返回：

```ts
type DiffResult =
  | { kind: 'text'; patch: string }
  | { kind: 'binary' }
  | { kind: 'unversioned' }
```

unversioned 在 application 层可直接短路，无需实际执行 diff。

## 8.5 Commit

```bash
svn commit --non-interactive -m MESSAGE -- PATHS...
```

解析：

```text
Committed revision N.
```

## 8.6 Add

```bash
svn add --parents -- PATHS...
```

## 8.7 Delete

普通：

```bash
svn delete -- PATHS...
```

Missing：

```bash
svn delete --force -- PATHS...
```

## 8.8 Revert

```bash
svn revert -- PATHS...
```

MVP 不对 directory 做 recursive revert。

## 8.9 Update

```bash
svn update --non-interactive
```

支持 stdout streaming。

## 8.10 Checkout

```bash
svn checkout URL DEST --non-interactive
```

支持 stdout streaming。

## 8.11 Log

默认：

```bash
svn log --xml -v -l 100 -r HEAD:1 -- .
```

目标为当前 working copy URL，而不是 repository root。

---

# 9. Change Domain Rules

支持：

```ts
type SvnChangeStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'unversioned'
  | 'missing'
  | 'replaced'
  | 'conflicted'
  | 'ignored'
  | 'external'
  | 'obstructed'
  | 'incomplete'
```

状态字母：

```text
M A D ? ! R C I X O ~
```

隐藏：

- ignored
- external

默认 checked：

- modified
- added
- deleted
- replaced

可 commit：

- modified
- added
- deleted
- replaced

可 add：

- unversioned

可 revert：

- modified
- added
- deleted
- replaced
- missing
- conflicted

但 `nodeKind === 'dir'` 禁止 revert。

可 delete：

- modified
- added
- deleted
- replaced
- missing
- conflicted

Missing delete 必须 force。

---

# 10. Refresh Semantics

Repository refresh 同时执行：

```text
svn info --xml
svn status --xml --ignore-externals
```

并行读取。

结果处理：

1. hidden statuses 过滤；
2. changes 排序；
3. reconcile checkbox；
4. reconcile selected file；
5. 更新 repository revision。

Selection reconcile 规则：

- 已存在文件保留用户之前 checked/unchecked 状态；
- 新出现的 M/A/D/R 按默认规则 checked；
- mutation 可通过 `forceChecked` 强制目标项在刷新后 checked，例如 Add。

所有成功 mutation 都必须走同一 refresh 流程。

---

# 11. Diff Request Semantics

Diff 需要防止快速切换文件时 race condition。

实现要求：

- 每次请求有递增 request id 或等价 generation；
- 新请求 abort 旧请求；
- completion 时校验 request id；
- aborted request 不显示 error；
- Refresh / mutation 后 cache invalidation；
- `<diff>` 所在 Detail pane 是 diff 的主要滚动容器。

不得让旧文件 diff 覆盖当前 selection。

---

# 12. Commit State Machine

可提交：

```ts
canCommit =
  message.trim().length > 0 &&
  committablePaths.length > 0 &&
  !mutating
```

开始 commit：

- mutation = `commit`；
- 保留 message / checkedPaths 副本；
- disable write operations。

成功：

- message = '';
- checkedPaths = empty;
- refresh。

失败：

- 恢复 message；
- 恢复 checkedPaths；
- 设置 mutation error。

快捷键 `⌘Enter` 必须调用同一 commit path，不得复制业务逻辑。

---

# 13. Mutation Serialization

`OperationManager` 是所有 write mutation 的唯一并发门禁。

同一时间只允许一个 mutation。

范围：

- commit
- update
- add
- delete
- revert
- checkout

UI 也通过 `mutating !== null` 同步 disable 相应按钮。

任何新增 write 操作都必须接入 OperationManager，不能绕过。

---

# 14. RepositoryScreen State

当前 RepositoryScreen 管理的主要状态包括：

- page
- live repository metadata
- changes
- checkedPaths
- selectedPath
- status generation / refresh state
- diff view / request state
- commitMessage
- mutation kind / error / output line
- confirmation dialog
- history
- selectedRevision
- history loading/error

当前实现刻意不引入全局状态库。

除非出现跨页面复杂共享或明显维护成本，不要为了“架构整洁”提前引入 Zustand/Redux。

---

# 15. Changes UI Contract

ChangesPane：

- 固定 list/detail 桌面布局；
- Changed Files 使用 `<virtual-list>`；
- path filter；
- Select all 只针对当前 filter 后可见 items；
- row click = select for diff；
- checkbox = commit selection；
- 两个行为必须分离。

Commit composer 位于 ChangesPane 底部。

Changes 页不得恢复成全窗口 bottom commit bar。

---

# 16. Diff UI Contract

DiffPanel 根据 `DiffView` 显示：

- idle；
- loading；
- error；
- text；
- binary；
- unversioned。

当前文件允许时提供：

- Add；
- Revert；
- Delete。

Revert / Delete 必须经过统一 confirmation flow。

---

# 17. Sidebar Contract

Sidebar 包含：

- workspace switcher；
- Changes；
- History；
- Working Copy；
- SVN revision / local change status；
- Update；
- Add unversioned files；
- Revert selected；
- Delete selected；
- SVN CLI version。

Workspace switcher 只切换 Recent working copies。

`Open Working Copy` / `Welcome Screen` 当前位于 Titlebar。

Sync label 当前语义是：

```text
0 local changes → Up to date
N local changes → N local changes
```

这不是 server freshness 检查，不允许把它描述为远端“已同步”。

---

# 18. History

默认 limit：

```ts
DEFAULT_LOG_LIMIT = 100
```

History 首次进入或 refresh 时加载真实 log。

Revision model：

```ts
interface SvnRevision {
  revision: number
  author?: string
  date?: string
  message: string
  changedPaths: ...
}
```

History filter 为客户端内存过滤。

当前支持搜索：

- commit message；
- author；
- revision。

当前不实现：

- My commits；
- branch chip；
- revision diff；
- pagination。

不得把设计稿中的未实现 chips 当成现有功能。

---

# 19. Recent & Settings

配置路径：

```text
~/Library/Application Support/Revision/settings.json
```

schema：

```ts
interface Settings {
  version: 1
  recentWorkingCopies: RecentWorkingCopy[]
  lastWorkingCopy?: string
  window?: {
    width: number
    height: number
  }
}
```

Recent：

```ts
MAX_RECENT_WORKING_COPIES = 10
```

save 使用：

1. 写 `.tmp`；
2. rename 覆盖；

保持 atomic write。

无效 JSON 回退到 default settings。

---

# 20. Directory Picker

macOS 使用系统目录选择能力的 adapter。

约束：

- cancel 返回 `null`；
- AppleEvent cancel / 本地化取消错误不得作为应用错误；
- picker 与业务 open use case 分离。

Windows picker 不属于 MVP。

---

# 21. Error Model

```ts
type AppErrorKind =
  | 'svn-not-found'
  | 'not-working-copy'
  | 'authentication'
  | 'network'
  | 'working-copy-locked'
  | 'conflict'
  | 'command-failed'
  | 'unknown'
```

当前 classifier 已可靠处理：

- aborted；
- E155007 / not working copy；
- E170001 / E215004 / authentication；

其它大多回退 `command-failed`。

因此 network / locked / conflict 虽已在 type 中定义，但暂时不能视为完整实现。

Polish 阶段补齐 classifier 时，应以 SVN error code + message 双重匹配，并保留：

- command；
- stderr；
- exitCode。

---

# 22. Authentication

所有 network / write 命令保持 `--non-interactive`。

Revision 不实现 credential UI，不保存用户名密码。

认证失败文案：

- 明确指出 authentication required；
- 指引用户先在 Terminal 使用 svn 完成认证；
- 然后 retry。

不要在 MVP 中引入 Keychain / credential manager。

---

# 23. Shortcuts

当前：

```text
⌘O       open-working-copy
⌘⇧O      checkout
⌘Enter   commit
Esc      close-dialog
```

待实现：

```text
⌘R       refresh
```

快捷键通过 app-level listener 分发，具体 feature 复用已有 action handlers。

不得在 textarea / component 中复制一套不同的 mutation 逻辑。

---

# 24. Scrolling & Virtualization

GPUIX 下避免不必要的 nested vertical scroll。

当前原则：

- Changed Files：virtual-list 自己滚动；
- Diff：Detail pane 自己滚动；
- History list：virtual-list 自己滚动；
- Revision detail：右侧独立滚动；
- 外层 Repository shell 不承担内容滚动。

新增布局需保持 `minHeight: 0` / `minWidth: 0` 等 flex 可收缩约束，避免 GPUIX overflow 问题。

---

# 25. Tests

当前已有：

```text
tests/unit/
tests/integration/
tests/ui/
tests/ui/screenshots/
```

覆盖包括：

- SVN argv；
- XML parsers；
- change rules；
- command runner；
- settings/recent；
- open repository；
- refresh；
- diff race handling；
- commit；
- mutations；
- checkout；
- history；
- UI interactions。

集成测试优先使用本地 `file://` SVN repository，避免依赖网络。

修改 parser / argv / selection semantics / mutation semantics 时必须同步测试。

---

# 26. Preview Fixtures

开发阶段保留：

```bash
bun run dev:welcome
bun run dev:changes
bun run dev:history
```

它们用于视觉开发，不得污染 live repository flow。

生产行为必须由真实 SVN service 驱动。

---

# 27. Known Gaps

当前明确未完成：

1. Working Copy 详情页；
2. Cmd+R；
3. 完整 classifySvnError；
4. Error Banner / Show Details polish；
5. 最终 screenshot 验收；
6. 至少一条 E2E happy path；
7. unsigned `bun run build` 最终验收。

这些属于当前 MVP 收尾优先级。

---

# 28. Change Rules for Future Agents

后续实现必须遵守：

1. 不自行新增 PRD 非目标功能；
2. UI 不直接运行 SVN CLI；
3. SVN argv 必须为数组；
4. path 参数使用 `--`；
5. write mutation 必须通过 OperationManager；
6. mutation 成功必须 refresh；
7. destructive action 必须确认；
8. 不对目录 recursive revert；
9. checkbox selection 与 row selection 独立；
10. 不引入 Git staging 概念；
11. 不引入 credential storage；
12. 不为架构形式主义提前引入全局状态库；
13. History 保持 Repository 内页面；
14. Changes 保持 Sidebar + List + Detail；
15. 先运行 `bun run typecheck` 与 `bun test` 再提交。

---

# 29. Acceptance Commands

功能改动完成后至少执行：

```bash
bun run typecheck
bun test
```

涉及 build / packaging 时额外执行：

```bash
bun run build
```

涉及核心 UI 时，应更新或核对对应 screenshot / UI test。

---

# 30. Current MVP Completion Boundary

当前代码已经可以完成：

```text
Launch
→ Detect SVN
→ Open / Checkout
→ Status
→ Filter / Select
→ Diff
→ Add / Revert / Delete
→ Commit
→ Update
→ History
```

后续开发应以“稳定并完成这条链路”为第一目标，而不是继续扩张 SVN feature surface。
