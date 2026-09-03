# SVN GUI — Architecture Design

**Architecture Style:** Layered Application Architecture
**Frontend:** React on GPUIX
**Runtime:** Bun
**External System:** SVN CLI

---

# 1. Architecture Goals

架构重点解决五个问题：

1. GPUIX 是快速发展的 UI framework；
2. SVN CLI 属于外部 process；
3. SVN 命令存在长耗时操作；
4. Working Copy 状态可能随 IDE / filesystem 变化；
5. UI framework 将来可能更换。

因此核心原则是：

> UI 与 SVN infrastructure 必须严格解耦。

---

# 2. High-Level Architecture

```text
┌────────────────────────────────────────────────────┐
│                   Presentation                     │
│                                                    │
│                React + GPUIX                       │
│                                                    │
│  Welcome  Changes  Diff  Commit  History Dialogs  │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                Application Layer                   │
│                                                    │
│   OpenRepository                                   │
│   RefreshRepository                                │
│   CheckoutRepository                               │
│   CommitChanges                                    │
│   UpdateRepository                                 │
│   RevertChanges                                    │
│   AddFiles                                         │
│   DeleteFiles                                      │
│   LoadHistory                                      │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                    Domain                          │
│                                                    │
│ Repository                                         │
│ WorkingCopyChange                                  │
│ SvnRevision                                        │
│ DiffResult                                         │
│ Operation                                          │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                Infrastructure                      │
│                                                    │
│ SvnClient                                          │
│ CommandRunner                                      │
│ XML Parsers                                        │
│ DirectoryPicker                                    │
│ SettingsRepository                                 │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                  Operating System                  │
│                                                    │
│             svn CLI / filesystem                   │
└────────────────────────────────────────────────────┘
```

---

# 3. Dependency Rule

依赖只能：

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure implements interfaces
```

禁止：

```text
Component
  ↓
Bun.spawn(["svn", ...])
```

禁止：

```text
statusParser
  ↓
React Store
```

---

# 4. Presentation Layer

Presentation 只负责：

```text
render
interaction
input
selection
dialogs
loading state
```

例如：

```tsx
function CommitPanel() {
  const message = useAppStore(...)
  const selectedCount = useAppStore(...)

  return (
    <textarea ... />
  )
}
```

它不知道：

```text
svn commit
```

具体如何执行。

---

# 5. Application Layer

Application Layer 是整个应用真正的控制中心。

例如：

```ts
async function commitChanges() {
  const state = store.getState();

  validateCommit(state);

  return operationManager.run('commit', async () => {
    const result = await svn.commit(
      state.repository,
      [...state.checkedPaths],
      state.commitMessage,
    );

    await refreshRepository();

    return result;
  });
}
```

Application Service 管理：

- operation lifecycle
- refresh
- cache invalidation
- UI state transition
- error translation

---

# 6. Domain Layer

Domain 不依赖：

```text
React
GPUIX
Bun
XML
CLI
filesystem
```

它只包含：

```text
types
business rules
pure functions
```

例如：

```ts
function isCommittable(change: WorkingCopyChange) {
  return ['modified', 'added', 'deleted', 'replaced'].includes(change.status);
}
```

---

# 7. Infrastructure Layer

Infrastructure 封装所有外部依赖：

```text
svn
filesystem
OS dialogs
settings files
```

未来可以：

```text
CLI SvnClient
       ↓
Native Rust SvnClient
```

而 Presentation 不需要变化。

---

# 8. SVN Command Architecture

推荐：

```text
SvnClient
   │
   ├── info()
   ├── status()
   ├── diff()
   ├── commit()
   ├── update()
   ├── revert()
   ├── add()
   ├── delete()
   └── log()
        │
        ▼
CommandRunner
        │
        ▼
Bun.spawn
        │
        ▼
svn
```

所有 process 逻辑集中到：

```text
CommandRunner
```

---

# 9. Command Runner Design

```ts
class CommandRunner {
  async run(request: CommandRequest): Promise<CommandResult>;

  runStreaming(
    request: CommandRequest,
    callbacks: CommandCallbacks,
  ): RunningCommand;
}
```

RunningCommand：

```ts
interface RunningCommand {
  promise: Promise<CommandResult>;
  cancel(): void;
}
```

---

# 10. Process Lifecycle

短操作：

```text
status
info
diff
log
```

使用：

```text
run()
```

长操作：

```text
checkout
update
commit
```

使用：

```text
runStreaming()
```

输出：

```text
stdout chunk
stderr chunk
```

可以实时更新 UI operation message。

---

# 11. Cancellation Model

Diff 是最重要的 cancellation case。

```text
select A
 ↓
diff A starts

select B
 ↓
kill diff A
 ↓
diff B starts
```

必须确保：

旧 Diff 完成后不能覆盖新 Diff。

除 kill 外，再使用：

```text
requestId
```

校验。

---

# 12. Mutation Serialization

SVN Working Copy 不适合多个 mutation 并行。

必须：

```text
single mutation lane
```

例如：

```text
commit
update
revert
add
delete
checkout
```

同一时刻只允许一个。

结构：

```text
OperationManager
```

```ts
class OperationManager {
  private activeMutation: Operation | null;

  async runMutation<T>(
    kind: OperationKind,
    operation: () => Promise<T>,
  ): Promise<T>;
}
```

---

# 13. Read / Write Separation

Read：

```text
info
status
diff
log
```

Mutation：

```text
checkout
update
commit
revert
add
delete
```

Read 可并发。

Mutation 串行。

Mutation 发生时：

暂停自动 refresh。

---

# 14. Store Architecture

状态按生命周期分层，而不是强行放进一个全局 Store。

App shell React state：

```text
svn availability
current repository
recent working copies
checkout dialog
appearance
open/switch error
```

Repository-scoped Zustand canonical state：

```text
page
repository
changes
checkedPaths
selectedPath
commitMessage
history
selectedRevision
refresh / history loading
mutation kind / output
repository errors
```

RepositoryScreen transient request state：

```text
diff view
AbortController
requestId / generation
diff cache
confirmation dialog
```

Derived：

```text
selectedCount
selectedChange
canCommit
committable/addable/revertable/deletable paths
sync label
status summary
```

原则是按 owner / lifetime 放状态：只有多个页面真正共享且具有业务意义的数据才进入 Zustand；短生命周期请求控制对象不进入 Store。
# 15. State Diagram

Application：

```text
                 ┌─────────┐
                 │ startup │
                 └────┬────┘
                      │
                      ▼
                  check svn
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
          available        unavailable
              │
              ▼
          welcome
              │
     open / checkout
              │
              ▼
        loading repository
              │
       ┌──────┴──────┐
       ▼             ▼
    success         error
       │
       ▼
   repository
```

---

# 16. Repository State

```text
repository
   │
   ├── idle
   │
   ├── refreshing
   │
   ├── mutating
   │
   └── error
```

UI 不应维护几十个：

```text
isUpdating
isCommitting
isReverting
isAdding
```

而使用：

```ts
operation?.kind;
```

---

# 17. Diff State Machine

```text
idle
 ↓ select
loading
 ├ success → ready
 ├ binary  → binary
 ├ abort   → idle/new loading
 └ error   → error
```

类型：

```ts
type DiffState =
  | { type: 'idle' }
  | { type: 'loading'; path: string; requestId: number }
  | { type: 'ready'; path: string; patch: string }
  | { type: 'binary'; path: string }
  | { type: 'unversioned'; path: string }
  | { type: 'error'; path: string; error: AppError };
```

使用 discriminated union。

不要：

```ts
loading: boolean
error?: Error
patch?: string
```

这种容易形成非法组合的状态。

---

# 18. Commit State Machine

```text
editing
 ↓
ready
 ↓ Commit
committing
 ├ success → editing(empty)
 └ error   → editing(previous state)
```

失败不能清除用户 message。

---

# 19. Status Refresh Strategy

刷新触发：

```text
repository opened
manual refresh
checkout success
commit success
update success
revert success
add success
delete success
```

MVP 不 watch filesystem。

---

# 20. Refresh Concurrency

可能出现：

```text
Refresh #1
Refresh #2
```

必须使用：

```text
refreshGeneration
```

例如：

```ts
const id = ++refreshGeneration

const data = await svn.status(...)

if (id !== refreshGeneration)
  return
```

避免旧请求覆盖新请求。

---

# 21. Diff Cache Architecture

缓存：

```text
repository root
+
relative path
```

key：

```text
${repository.rootPath}:${path}
```

Mutation 后：

```text
cache.clear()
```

不需要复杂 cache invalidation。

---

# 22. Repository Identity

不能只使用文件夹名。

内部 identity：

```text
repository.rootPath
```

未来多个 repository 可通过：

```text
UUID + path
```

建立稳定 identity。

---

# 23. XML Boundary

XML 永远在 Infrastructure 层结束。

例如：

```text
stdout XML
 ↓
StatusParser
 ↓
WorkingCopyChange[]
```

Application 和 UI 永远不能看到：

```text
XMLNode
```

---

# 24. Error Boundary

低层：

```text
CommandError
```

例如：

```ts
class CommandError extends Error {
  command;
  cwd;
  exitCode;
  stdout;
  stderr;
}
```

然后：

```text
CommandError
 ↓
classifySvnError()
 ↓
AppError
 ↓
UI
```

---

# 25. Security Boundary

## Command injection

所有 path：

```text
argv
```

禁止 shell。

---

## Credentials

Application 不保存：

```text
username
password
token
private key
```

---

## SSL

禁止自动添加：

```text
--trust-server-cert
```

任何 SSL trust 行为必须未来作为显式 UX 实现。

---

# 26. Destructive Action Boundary

以下行为必须在 Application 调用前有确认：

```text
delete existing file
revert
```

Infrastructure 不应该弹 Dialog。

这样：

```text
Domain/Infrastructure
```

仍然可以进行 automated testing。

---

# 27. Directory Picker Architecture

```text
Presentation
    ↓
DirectoryPicker interface
    ↓
MacOSDirectoryPicker
    ↓
osascript
```

以后：

```text
MacOSDirectoryPicker
```

可替换：

```text
GpuixNativeDirectoryPicker
```

---

# 28. GPUIX Isolation

不要到处直接依赖：

```text
@gpuix/native
```

正常业务组件主要依赖：

```text
@gpuix/react
```

自定义 native capability 单独放：

```text
platform/
```

GPUIX 升级时修改面尽量集中。

---

# 29. UI Architecture

打开 working copy 后使用稳定的 Repository shell：

```text
RepositoryScreen
│
├── Sidebar
│
└── page content
    ├── Changes
    │   ├── ChangesPanel
    │   │   ├── Changed Files
    │   │   └── Commit Composer
    │   └── DiffPanel
    ├── History
    │   └── HistoryView
    │       ├── Revision List
    │       └── Revision Detail
    └── Working Copy
        └── WorkingCopyView
            ├── Local checkout
            ├── Repository info
            └── Local status
```

Changes / History 保持 `Sidebar + List + Detail` 的稳定信息架构；Working Copy 是同一 shell 内的 overview 页面。

不要重新引入顶部 RepositoryToolbar，也不要把 Commit composer 变成跨窗口底栏。
# 30. View Navigation

MVP 不使用 Router Library。

顶层只区分：

```ts
type AppView = 'welcome' | 'repository';
```

Repository 内部导航：

```ts
type RepositoryPage =
  | 'changes'
  | 'history'
  | 'working-copy';
```

Sidebar 只改变 repository-scoped `page`；不会卸载整个 App shell，也不会创建 History 顶层 route。

打开 / checkout working copy 进入 repository；Welcome screen 则关闭当前 repository 回到 Welcome。
# 31. History Architecture

History 是 Repository shell 内的 page，而不是独立顶层 View：

```text
RepositoryScreen
  Sidebar
    Changes
    History
    Working Copy

  page=history
    HistoryView
      Revision List
      Revision Detail
```

这样 Workspace switcher、SVN Update Card、Quick actions 与 Working Copy identity 保持稳定，不因查看 History 被拆成另一套导航。

History 与 Changes 主工作区不会同时渲染，因此仍满足“避免 Diff 与 History nested vertical scroll 冲突”的原始目标。
# 32. Testing Pyramid

```text
             E2E
             /\
            /  \
           / UI \
          /------\
         /Integration\
        /------------\
       /  Unit Tests  \
      /________________\
```

重点测试：

```text
XML parsers
SvnClient
Application Services
```

UI 测试只验证关键流程。

---

# 33. Unit Tests

最重要：

```text
status parser
info parser
log parser
error classifier
selection reconciliation
domain rules
```

---

# 34. Integration Tests

Integration 必须使用真实：

```text
svn
svnadmin
```

和：

```text
file:// repository
```

覆盖：

```text
checkout
status
diff
add
delete
revert
commit
update
history
```

---

# 35. UI Screenshot Tests

使用 GPUIX GPU test renderer。

建议 snapshot：

```text
welcome.png
repository-clean.png
repository-changes.png
diff.png
checkout-dialog.png
revert-dialog.png
history.png
error.png
```

---

# 36. Codex Agent Workflow

推荐给 Codex 增加：

```text
AGENTS.md
```

核心约束：

```text
Read:
docs/PRD.md
docs/SPEC.md
docs/ARCHITECTURE.md

before implementing features.
```

每个任务：

```text
1 Read relevant docs
2 Identify acceptance criteria
3 Implement smallest vertical slice
4 Add tests
5 Run typecheck/tests
6 Do not add features outside PRD
```

---

# 37. Suggested AGENTS.md Rules

```text
- Never call Bun.spawn directly from React components.
- Never invoke svn through a shell string.
- All SVN commands belong in services/svn.
- Structured SVN output must use XML when available.
- New mutating SVN operations must use OperationManager.
- Mutations must refresh status after success.
- Do not persist credentials.
- Do not add dependencies without a concrete requirement.
- Prefer GPUIX native elements over reimplementing equivalents.
- Prefer <diff> for unified patches.
- Prefer <virtual-list> for long lists.
- Avoid nested vertical scrolling.
- macOS arm64 is the MVP target.
- Keep Windows-specific work out of MVP unless explicitly requested.
```

---

# 38. Suggested ADRs

随着项目推进，可增加：

```text
docs/adr/
```

第一批：

```text
0001-use-svn-cli.md
0002-use-gpuix.md
0003-macos-first.md
0004-no-filesystem-watcher-in-mvp.md
0005-no-auth-ui-in-mvp.md
```

这样 Codex 不会未来反复推翻关键架构决策。

---

# 39. Future Architecture Extensions

以下功能可以在当前架构上自然增加：

```text
filesystem watcher
authentication dialog
conflict resolver
file history
blame
changelist
multiple working copies
Windows picker
native Rust SVN adapter
```

无需重新设计 UI/Application boundary。

---

# 40. Final Architecture Principle

项目应该始终保持：

```text
             GUI
              │
              ▼
       Application Logic
              │
              ▼
          SvnClient
              │
              ▼
           svn CLI
```

而不是：

```text
React component
     │
     ├── svn status
     ├── XML parsing
     ├── state
     ├── dialogs
     └── error handling
```

如果后者开始出现，应立即重构。

这条边界是整个项目长期可维护性的核心。
