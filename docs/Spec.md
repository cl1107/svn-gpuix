# SVN GUI — Technical Specification

**Version:** 0.1
**Target Platform:** macOS ARM64
**Primary UI:** GPUIX
**Language:** TypeScript
**Runtime:** Bun
**SVN Interface:** `svn` command-line client

---

# 1. 技术目标

本项目不是实现 SVN client library。

核心架构：

```text
GPUIX
  ↓
React
  ↓
Application Services
  ↓
SvnClient
  ↓
Bun.spawn()
  ↓
System svn CLI
```

SVN CLI 是唯一 SVN backend。

---

# 2. 技术栈

## Runtime

```text
Bun
```

原因：

- 原生 TypeScript
- subprocess API
- 文件系统 API
- 开发体验简单
- GPUIX 推荐 Bun hot workflow

---

## UI

```text
@gpuix/react
@gpuix/native
react
```

使用 GPUIX：

```text
<div>
<text>
<input>
<textarea>
<virtual-list>
<diff>
<anchored>
```

---

## XML Parser

建议：

```text
fast-xml-parser
```

用于解析：

```text
svn status --xml
svn info --xml
svn log --xml
```

不要自行使用 regex 解析 XML。

---

# 3. 推荐目录结构

当前 MVP 以分层职责为准，不要求为每个视觉小块拆一个文件。实际结构：

```text
src/
├── app/
│   ├── App.tsx
│   ├── ThemeContext.tsx
│   ├── Titlebar.tsx
│   ├── appearance.ts
│   ├── services.ts
│   ├── shortcuts.ts
│   └── theme.ts
├── application/
│   ├── checkoutRepository.ts
│   ├── commitChanges.ts
│   ├── loadDiff.ts
│   ├── loadHistory.ts
│   ├── mutateWorkingCopy.ts
│   ├── openRepository.ts
│   ├── operationManager.ts
│   └── refreshRepository.ts
├── components/
├── domain/
├── features/
│   ├── changes/
│   ├── history/
│   ├── repository/
│   │   ├── RepositoryScreen.tsx
│   │   ├── Sidebar.tsx
│   │   └── WorkingCopyView.tsx
│   └── welcome/
├── services/
│   ├── picker/
│   ├── settings/
│   └── svn/
├── store/
│   ├── RepositoryStoreContext.tsx
│   ├── repositoryStore.ts
│   └── selectors.ts
└── main.tsx

tests/
├── fixtures/
├── integration/
├── ui/
└── unit/
```

`application/` 是刻意增加的 use-case 层；`store/` 使用 repository-scoped Zustand store。不要为了匹配旧目录草图而把 Application 逻辑塞回 React component，也不要把所有状态提升成一个全局 Store。
# 4. Domain Model

## Repository

```ts
export interface Repository {
  rootPath: string;
  repositoryUrl: string;
  repositoryRoot: string;
  uuid?: string;
  revision: number;
}
```

---

## WorkingCopyChange

```ts
export type SvnChangeStatus =
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
  | 'incomplete';

export interface WorkingCopyChange {
  path: string;
  absolutePath: string;

  nodeKind?: 'file' | 'dir';

  status: SvnChangeStatus;

  propertyStatus?: string;

  revision?: number;

  checked: boolean;
}
```

注意：

`checked` 实际属于 UI/application state。

如果希望 domain 更纯：

```ts
checkedPaths: Set<string>;
```

应单独保存在 Store。

推荐使用后一种方案。

---

# 5. Revision Model

```ts
export interface SvnRevision {
  revision: number;
  author?: string;
  date?: string;
  message: string;
  changedPaths: RevisionChangedPath[];
}

export interface RevisionChangedPath {
  path: string;
  action: 'A' | 'M' | 'D' | 'R';
  copyFromPath?: string;
  copyFromRevision?: number;
}
```

---

# 6. Operation Model

```ts
export type OperationKind =
  | 'checkout'
  | 'status'
  | 'diff'
  | 'commit'
  | 'update'
  | 'revert'
  | 'add'
  | 'delete'
  | 'log';

export interface RunningOperation {
  id: string;
  kind: OperationKind;

  startedAt: number;

  blocking: boolean;
  cancelable: boolean;

  message?: string;
}
```

---

# 7. SVN Client Boundary

Infrastructure 提供 `CliSvnClient`，Application use case 通过**窄接口**依赖它，而不是依赖一个巨大的全功能 interface。

当前 adapter 的稳定能力：

```ts
class CliSvnClient {
  getVersion(signal?: AbortSignal): Promise<string>;

  validateWorkingCopy(path: string, signal?: AbortSignal): Promise<Repository>;
  getStatus(rootPath: string, signal?: AbortSignal): Promise<WorkingCopyChange[]>;
  getDiff(rootPath: string, path: string, signal?: AbortSignal): Promise<DiffResult>;

  checkout(input: {
    url: string;
    destination: string;
    signal?: AbortSignal;
    onStdout?: (chunk: string) => void;
  }): Promise<Repository>;

  update(
    rootPath: string,
    options?: { signal?: AbortSignal; onStdout?: (chunk: string) => void },
  ): Promise<UpdateResult>;

  commit(
    rootPath: string,
    paths: string[],
    message: string,
    signal?: AbortSignal,
  ): Promise<CommitResult>;

  revert(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void>;
  add(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void>;
  delete(
    rootPath: string,
    paths: string[],
    options?: { force?: boolean; signal?: AbortSignal },
  ): Promise<void>;

  getLog(
    rootPath: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<SvnRevision[]>;
}
```

Application 层分别定义 `WorkingCopyReader`、`DiffReader`、`CommitClient`、`WorkingCopyMutator`、`HistoryReader` 等最小 port；`CliSvnClient` 通过 TypeScript structural typing 满足它们。

命令执行仍统一落到 `services/svn/CommandRunner`。UI 不直接依赖 CLI 细节。
# 8. Command Runner

禁止业务代码直接调用：

```ts
Bun.spawn();
```

统一：

```ts
interface CommandRequest {
  args: string[];
  cwd?: string;
  signal?: AbortSignal;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
```

实现：

```text
services/svn/commandRunner.ts
```

---

# 9. 安全执行规则

禁止：

```ts
Bun.spawn(['sh', '-c', `svn diff ${path}`]);
```

禁止字符串 shell interpolation。

必须：

```ts
Bun.spawn(['svn', 'diff', '--', path]);
```

即：

```text
shell = false
argv array
```

这样可以正确处理：

- 空格
- 中文路径
- 引号
- 特殊字符

并避免 command injection。

---

# 10. SVN Availability

应用启动时执行：

```bash
svn --version --quiet
```

失败：

Welcome Screen 显示：

```text
SVN CLI was not found.

Install Subversion and restart the application.
```

禁止整个应用退出。

---

# 11. Working Copy Validation

执行：

```bash
svn info --xml .
```

`cwd`：

```text
selected directory
```

成功则解析：

```xml
<entry
  kind="dir"
  path="."
  revision="123">

  <url>...</url>

  <repository>
    <root>...</root>
    <uuid>...</uuid>
  </repository>
</entry>
```

获得：

```ts
Repository;
```

---

# 12. Open Working Copy

流程：

```text
Browse
 ↓
DirectoryPicker.pick()
 ↓
svn info --xml
 ↓
valid?
 ├ yes → open repository
 └ no  → error
```

---

# 13. Directory Picker

GPUIX MVP 不要求把 picker 与 SVN service 耦合。

定义：

```ts
export interface DirectoryPicker {
  pickDirectory(options?: { title?: string }): Promise<string | null>;
}
```

macOS MVP 可以使用：

```text
osascript
```

调用系统 folder picker。

例如逻辑：

```text
osascript
-e
POSIX path of (choose folder with prompt "Open SVN Working Copy")
```

用户 Cancel：

```ts
return null;
```

未来可以替换为：

```text
native GPUI/N-API picker
```

而不改变 UI。

---

# 14. Checkout

命令：

```bash
svn checkout URL DESTINATION --non-interactive
```

必须通过 argv：

```ts
['svn', 'checkout', url, destination, '--non-interactive'];
```

成功后：

```text
validateWorkingCopy(destination)
```

并自动打开。

---

# 15. Authentication 策略

MVP 所有远程 SVN 操作使用：

```text
--non-interactive
```

原因：

GUI 内没有 stdin authentication prompt。

允许 SVN 使用：

```text
~/.subversion/auth
```

中的 credential cache。

如果认证失败：

UI 展示：

```text
Authentication required.

Authenticate using svn in Terminal first and retry.
```

绝对禁止：

```text
--username
--password
```

写入 settings。

---

# 16. Status

命令：

```bash
svn status --xml --ignore-externals
```

cwd：

```text
repository.rootPath
```

解析：

```xml
<target path=".">
  <entry path="src/App.ts">
    <wc-status
      item="modified"
      props="none"
      revision="120"/>
  </entry>
</target>
```

转换为：

```ts
WorkingCopyChange;
```

---

# 17. 默认状态过滤

不要展示：

```text
normal
ignored
external
```

展示：

```text
modified
added
deleted
unversioned
missing
replaced
conflicted
obstructed
incomplete
```

---

# 18. Status Default Selection

自动 checked：

```text
modified
added
deleted
replaced
```

默认 unchecked：

```text
unversioned
missing
conflicted
obstructed
incomplete
```

Refresh 时：

尽量保留已有用户 selection。

算法：

```text
oldSelectedPaths ∩ currentCommittablePaths
```

新出现的 modified 文件可默认 checked。

---

# 19. Diff

命令：

```bash
svn diff --git -- PATH
```

`cwd`：

```text
repository.rootPath
```

输出直接传：

```tsx
<diff patch={patch} />
```

不要自行解析成每一行 React node。

---

# 20. Diff Cache

Diff cache 属于当前打开 RepositoryScreen 的短生命周期请求状态，不持久化到 Zustand。

当前实现：

```ts
Map<string, DiffResult>
```

由于每个 `RepositoryScreen` / Store 只对应一个 working copy，cache key 使用相对 path 即可。

以下操作成功后清空：

```text
Refresh
Update
Add
Delete
Revert
Commit
```

切换 working copy 时 RepositoryScreen reset，同样清空 cache。

不要为了这一份瞬时 cache 引入全局缓存层。
# 21. Diff Cancellation

用户快速切换：

```text
A.ts
B.ts
C.ts
```

不能等三个 diff 全部完成。

需要：

```text
AbortController
```

选择新文件时：

```text
abort previous diff
start new diff
```

如果 Bun subprocess 不直接支持 AbortSignal：

封装：

```text
signal.abort()
→ process.kill()
```

---

# 22. Binary Diff

如果 stdout 为空并且 SVN 输出提示 binary：

返回：

```ts
{
  kind: 'binary';
}
```

推荐升级 Diff API：

```ts
type DiffResult =
  | {
      kind: 'text';
      patch: string;
    }
  | {
      kind: 'binary';
    }
  | {
      kind: 'unversioned';
    };
```

---

# 23. Add

命令：

```bash
svn add --parents -- PATH...
```

只允许：

```text
unversioned
```

状态。

成功后：

```text
refreshStatus()
```

---

# 24. Delete

已有文件：

```bash
svn delete -- PATH...
```

必须先由 UI confirm。

Missing 文件：

```bash
svn delete --force -- PATH...
```

使其 schedule deletion。

不要默认使用：

```text
--force
```

删除仍存在的普通文件。

---

# 25. Revert

对文件：

```bash
svn revert -- PATH...
```

MVP 不支持：

```text
recursive directory revert
```

如果 status item 为目录，并且内部包含修改：

UI 不提供一键 recursive revert。

原因：

危险性过高。

---

# 26. Commit

前置校验：

```text
message.trim().length > 0

selectedPaths.length > 0

no blocking operation
```

执行：

```bash
svn commit PATH1 PATH2 ... -m MESSAGE --non-interactive
```

通过 argv。

绝对不要：

```text
拼 shell command
```

---

# 27. Commit Result

stdout 示例解析：

```text
Committed revision 123.
```

使用 regex 只解析 revision number 是允许的：

```ts
/Committed revision (\d+)\./;
```

因为这里不是结构化 XML 数据。

返回：

```ts
interface CommitResult {
  revision?: number;
  output: string;
}
```

---

# 28. Commit 后行为

成功：

```text
commit message = ''
selectedPaths = empty
diff cache = clear

refresh info
refresh status
```

失败：

保留：

```text
commit message
selection
```

---

# 29. Update

命令：

```bash
svn update --non-interactive
```

cwd：

```text
repository.rootPath
```

允许将 stdout 逐行发送给 UI：

```text
Updating...
U src/App.ts
G src/api.ts
Updated to revision 130.
```

MVP UI 不必设计复杂 progress bar。

可使用：

```text
spinner + current output line
```

---

# 30. Update 后

执行：

```text
clear diff cache
refresh repository info
refresh status
```

---

# 31. History

命令：

```bash
svn log --xml -v -l 100 .
```

cwd：

```text
repository.rootPath
```

解析：

```xml
<logentry revision="123">

<author>alice</author>

<date>
2026-09-01T...
</date>

<msg>
Fix user service
</msg>

<paths>
...
</paths>

</logentry>
```

---

# 32. History Pagination

MVP：

```text
100 revisions only
```

API 提前设计：

```ts
log({
  limit: 100,
  startRevision?: number
})
```

但 UI 暂不实现 pagination。

---

# 33. Store

MVP 使用 **repository-scoped Zustand vanilla store + React shell state**，而不是单一巨大 App Store。

App shell 的 React state 负责：

```text
SVN availability
current repository
recent working copies
checkout dialog
appearance preference
open / switch errors
```

每个 `RepositoryScreen` 创建一个 Zustand store，canonical repository state 包括：

```ts
interface RepositoryStoreState {
  page: 'changes' | 'history' | 'working-copy';
  repository?: Repository;

  changes: WorkingCopyChange[];
  checkedPaths: Set<string>;
  selectedPath: string | null;
  commitMessage: string;

  history: SvnRevision[];
  selectedRevision: number | null;

  refreshing: boolean;
  historyLoading: boolean;

  statusError: AppError | null;
  historyError: AppError | null;
  mutationError: AppError | null;

  mutating: MutationKind | null;
  operationLine: string | null;
}
```

Diff request state、AbortController、requestId 与 diff cache 留在 `RepositoryScreen`，因为它们是 transient request state，不是跨页面 canonical data。

Derived state 继续通过 selector / domain helper 计算，不重复存储。
# 34. Repository Open Use Case

```text
openRepository(path)

1 validate path
2 svn info
3 set repository
4 add recent
5 status
6 choose first changed file
7 load diff
```

---

# 35. Refresh Use Case

```text
refreshRepository()

Promise.all:
  svn info
  svn status

then:
  reconcile selections
  clear invalid selected path
```

status 和 info 可以并行。

---

# 36. Mutation Use Case

所有 mutation：

```text
runMutation(kind, callback)
```

统一：

```text
set blocking operation
clear error

try
    execute
    refresh
catch
    set error
finally
    clear operation
```

---

# 37. Operation Lock

维护：

```ts
let mutationRunning = false;
```

或者 Store operation。

如果已有 blocking operation：

```text
commit/update/revert/add/delete
```

按钮 disabled。

---

# 38. Error Model

```ts
export interface AppError {
  kind:
    | 'svn-not-found'
    | 'not-working-copy'
    | 'authentication'
    | 'network'
    | 'working-copy-locked'
    | 'conflict'
    | 'command-failed'
    | 'unknown';

  title: string;
  message: string;

  command?: string[];
  stderr?: string;
  exitCode?: number;
}
```

---

# 39. Error Classification

根据 stderr 识别常见情况：

```text
E155007 → not working copy
authentication failed → authentication
E155004 → working copy locked
E170013 / network → network
conflict → conflict
```

不要依赖分类才能显示错误。

无法识别：

```text
command-failed
```

---

# 40. 文件路径规则

UI 永远展示：

```text
relative path
```

Command cwd：

```text
working copy root
```

Command target：

```text
relative path
```

避免将 absolute paths 暴露给 SVN command unless necessary。

---

# 41. UI Component Tree

```text
<App>
  <Titlebar />

  <WelcomeScreen />

or

  <RepositoryScreen>
    <Sidebar />

    page = Changes
      <ChangesPanel>
        <virtual-list>
          <ChangeRow />
        </virtual-list>
        <CommitComposer />
      </ChangesPanel>
      <DiffPanel>
        <diff />
      </DiffPanel>

    page = History
      <HistoryView>
        Revision List
        Revision Detail
      </HistoryView>

    page = Working Copy
      <WorkingCopyView>
        Local checkout info
        Repository info
        Local status summary
      </WorkingCopyView>

    <Dialog />
    <ErrorBanner />
  </RepositoryScreen>
```

Commit composer 固定属于 Changes Pane，不是横跨窗口的底栏；History 与 Working Copy 都保留同一个 Repository shell / Sidebar。
# 42. GPUIX Diff

优先：

```tsx
<diff
  patch={patch}
  wordDiff
  style={{
    flexGrow: 1,
    minHeight: 0,
  }}
/>
```

不要第一版自己实现 syntax diff renderer。

---

# 43. GPUIX Virtual List

Changed Files：

```tsx
<virtual-list
  estimatedItemHeight={44}
  style={{
    flexGrow: 1,
    minHeight: 0,
  }}
>
  {changes.map(...)}
</virtual-list>
```

---

# 44. Scroll Architecture

GPUIX 当前不适合 nested vertical scrolling。

因此必须设计成：

```text
Changes list
```

和：

```text
Diff
```

是两个并列 pane。

不要：

```text
整个页面 Scroll
  └─ Diff Scroll
```

History 也作为独立 View。

---

# 45. Dialog

使用：

```text
<anchored>
```

- overlay。

需要支持：

```text
click outside
Esc
```

Destructive dialog：

```text
outside click = 不执行操作
```

---

# 46. UI Theme

应用支持：

```text
Light
Dark
System
```

Figma 的 Light 视觉稿是布局、层级、圆角和 light palette 的基准；Dark 是同一 token contract 的配套 palette，System 解析当前 macOS appearance。

规则：

- token 集中在 `src/app/theme.ts`；
- live UI 从 `ThemeProvider` / `useTheme()` 读取；
- 用户 preference 持久化到 settings；
- System 模式跟随 macOS appearance；
- GPUIX `<diff>` 显式接收 resolved appearance；
- component 内不散落独立 light/dark 常量。

因此不再采用“单 Dark Theme”的早期草案。
# 47. Status Semantic Color

建议：

```text
M  neutral/blue
A  green
D  red
?  muted
!  orange
C  red
R  purple
```

颜色不能成为唯一状态表达方式。

必须保留状态字母。

---

# 48. Settings Storage

推荐：

```text
~/Library/Application Support/<app-name>/settings.json
```

结构：

```ts
interface Settings {
  version: 1;

  recentWorkingCopies: {
    path: string;
    lastOpenedAt: number;
  }[];

  lastWorkingCopy?: string;

  window?: {
    width: number;
    height: number;
  };
}
```

写文件使用 atomic replace：

```text
settings.tmp
rename
```

---

# 49. 自动 Refresh

MVP 不实现 filesystem watcher。

原因：

- 降低复杂度；
- IDE 大量文件写入可能导致 status storm。

MVP：

```text
manual Refresh
+
mutation automatic refresh
+
app focus refresh optional
```

如果 GPUIX 后续有稳定 focus lifecycle：

窗口重新获得 focus 后：

```text
debounce 300ms
svn status
```

可作为增强。

---

# 50. Integration Testing

使用真正本地 SVN repository。

测试建立：

```bash
svnadmin create /tmp/test-repo
```

然后：

```bash
svn checkout file:///tmp/test-repo /tmp/wc
```

自动测试：

```text
create file
svn add
commit
modify
status
diff
revert
update
log
delete
```

这样比 mock `svn` 输出更可靠。

---

# 51. Parser Unit Tests

fixture：

```text
tests/fixtures/status/
tests/fixtures/info/
tests/fixtures/log/
```

至少覆盖：

Status：

```text
modified
added
deleted
unversioned
missing
conflicted
unicode path
space path
```

Log：

```text
empty message
unicode author
multi-line message
changed paths
```

---

# 52. UI Tests

使用 GPUIX test renderer。

测试：

```text
Welcome Screen renders
Changes list renders
Selecting row changes Diff
Checking checkbox changes Commit count
Empty commit message disables button
Dialog opens
Dialog cancel
Error banner
History screen
```

重要 View 加 screenshot regression。

---

# 53. E2E 测试

至少一个确定性的 MVP vertical happy-path 使用真实本地 `svnadmin` / `svn` 与 Application Services：

```text
create local repo
checkout
add + initial commit
modify file
refresh/status
load diff
commit selected path
refresh becomes clean
history includes commit
```

该测试验证从 Application → CliSvnClient → CommandRunner → real SVN repository 的完整业务链路。

GPUIX 页面导航、checkbox、dialog、diff render 等交互由 GPU UI tests 独立覆盖。不要强制把真实桌面窗口启动与本地 SVN 仓库生命周期塞进同一个脆弱测试进程。
# 54. Logging

开发环境：

```text
command
cwd
exit code
duration
```

禁止 log：

```text
password
credentials
environment secrets
file contents
```

Production 默认不生成 verbose log 文件。

---

# 55. Packaging

MVP：

```text
macOS arm64
```

第一阶段接受：

```text
unsigned development build
```

发布前需要：

```text
.app bundle
codesign
notarization
DMG/ZIP
```

不要在 MVP 初期因为 packaging 阻塞功能实现。

---

# 56. GPUIX Version

必须锁定精确版本。

禁止：

```json
"@gpuix/react": "latest"
```

使用：

```json
"@gpuix/react": "x.y.z"
"@gpuix/native": "x.y.z"
```

原因：

GPUIX 仍快速演进。

升级应独立 PR 完成。

---

# 57. Codex Implementation Order

Codex 必须严格按以下阶段实现。

## Phase 1 — Bootstrap

实现：

```text
GPUIX window
theme
Welcome screen
SVN detection
```

Acceptance：

```text
bun run dev
```

能够启动窗口。

---

## Phase 2 — Repository

实现：

```text
DirectoryPicker
svn info
open working copy
recent list
Repository Screen
```

---

## Phase 3 — Status

实现：

```text
status XML parser
Changed Files
Refresh
```

---

## Phase 4 — Diff

实现：

```text
select file
svn diff
GPUIX <diff>
loading
cancellation
```

---

## Phase 5 — Commit

实现：

```text
checkbox
commit message
commit selected files
refresh after commit
```

---

## Phase 6 — Mutations

实现：

```text
Update
Add
Delete
Revert
confirmation dialogs
operation lock
```

---

## Phase 7 — Checkout

实现：

```text
Checkout dialog
destination picker
svn checkout
automatic open
```

---

## Phase 8 — History

实现：

```text
log XML parser
History List
Revision Details
```

---

## Phase 9 — Polish

实现：

```text
Cmd+R / Esc 等 keyboard shortcuts
empty states
Error Banner + collapsed Show Details
common SVN error classification
Working Copy information page
core screenshot smoke coverage
real file:// integration coverage
one MVP vertical happy-path
unsigned development build command
```

Acceptance：

```text
bun run typecheck
bun test
bun run build
```

最终 macOS ARM64 验收必须在有 GPUIX native renderer 与系统 SVN 的机器执行。
# 58. 禁止 Codex 擅自增加的内容

除非需求文档更新，否则不要实现：

```text
Git support
SVN native Rust library
database
backend server
Electron
Tauri
webview
router library
GraphQL
REST API
plugin framework
conflict editor
branch/tag UI
custom updater
telemetry
authentication storage
```

保持 MVP scope。

---

# 59. Completion Criteria

代码完成必须满足：

```text
typecheck passes
unit tests pass
integration tests pass
core screenshot tests pass
no shell command interpolation
no credentials persisted
no blocking SVN call on UI render path
```

并且人工能够完成：

```text
checkout
open
status
diff
add
delete
revert
update
select
commit
history
```

完整流程。
