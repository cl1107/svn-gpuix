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

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.ts
│   └── shortcuts.ts
│
├── components/
│   ├── Button.tsx
│   ├── Checkbox.tsx
│   ├── Dialog.tsx
│   ├── EmptyState.tsx
│   ├── Spinner.tsx
│   └── ErrorBanner.tsx
│
├── features/
│   ├── welcome/
│   │   ├── WelcomeScreen.tsx
│   │   ├── CheckoutDialog.tsx
│   │   └── RecentWorkingCopies.tsx
│   │
│   ├── changes/
│   │   ├── ChangesPanel.tsx
│   │   ├── ChangeRow.tsx
│   │   ├── DiffPanel.tsx
│   │   └── ChangeActions.tsx
│   │
│   ├── commit/
│   │   └── CommitPanel.tsx
│   │
│   ├── history/
│   │   ├── HistoryView.tsx
│   │   ├── HistoryList.tsx
│   │   └── RevisionDetails.tsx
│   │
│   └── repository/
│       ├── RepositoryScreen.tsx
│       └── RepositoryToolbar.tsx
│
├── domain/
│   ├── repository.ts
│   ├── change.ts
│   ├── revision.ts
│   └── operation.ts
│
├── services/
│   ├── svn/
│   │   ├── SvnClient.ts
│   │   ├── commandRunner.ts
│   │   ├── status.ts
│   │   ├── info.ts
│   │   ├── diff.ts
│   │   ├── checkout.ts
│   │   ├── commit.ts
│   │   ├── update.ts
│   │   ├── revert.ts
│   │   ├── add.ts
│   │   ├── delete.ts
│   │   ├── log.ts
│   │   └── parsers/
│   │       ├── statusParser.ts
│   │       ├── infoParser.ts
│   │       └── logParser.ts
│   │
│   ├── picker/
│   │   ├── DirectoryPicker.ts
│   │   └── macosDirectoryPicker.ts
│   │
│   └── settings/
│       └── settingsRepository.ts
│
├── state/
│   ├── appStore.ts
│   └── selectors.ts
│
└── main.tsx

tests/
├── fixtures/
│   ├── status.xml
│   ├── info.xml
│   └── log.xml
│
├── unit/
├── integration/
└── ui/
```

---

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

# 7. SvnClient Interface

所有 UI 必须通过统一 Client 操作 SVN。

```ts
export interface SvnClient {
  getVersion(): Promise<string>;

  validateWorkingCopy(path: string): Promise<Repository>;

  checkout(input: { url: string; destination: string }): Promise<Repository>;

  status(repository: Repository): Promise<WorkingCopyChange[]>;

  diff(
    repository: Repository,
    path: string,
    signal?: AbortSignal,
  ): Promise<string>;

  update(repository: Repository): Promise<UpdateResult>;

  commit(
    repository: Repository,
    paths: string[],
    message: string,
  ): Promise<CommitResult>;

  revert(repository: Repository, paths: string[]): Promise<void>;

  add(repository: Repository, paths: string[]): Promise<void>;

  delete(repository: Repository, paths: string[]): Promise<void>;

  log(
    repository: Repository,
    options?: {
      limit?: number;
    },
  ): Promise<SvnRevision[]>;
}
```

---

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

Store：

```ts
Map<
  string,
  {
    patch: string;
    loadedAt: number;
  }
>;
```

当：

```text
Refresh
Update
Add
Delete
Revert
Commit
```

发生后：

```text
clear diff cache
```

---

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

推荐单一应用 Store。

MVP 可以使用：

```text
Zustand
```

或者自行实现 React context。

如果引入 Zustand：

```ts
interface AppState {
  repository: Repository | null;

  changes: WorkingCopyChange[];
  checkedPaths: Set<string>;

  selectedPath: string | null;

  diff:
    | { state: 'idle' }
    | { state: 'loading'; path: string }
    | { state: 'ready'; path: string; result: DiffResult }
    | { state: 'error'; path: string; error: AppError };

  commitMessage: string;

  history: SvnRevision[];

  operation: RunningOperation | null;

  error: AppError | null;

  recentWorkingCopies: RecentWorkingCopy[];
}
```

---

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

  <WelcomeScreen />

or

  <RepositoryScreen>

      <RepositoryToolbar />

      <MainSplit>

          <ChangesPanel>
              <virtual-list>
                  <ChangeRow />
              </virtual-list>
          </ChangesPanel>

          <DiffPanel>
              <diff />
          </DiffPanel>

      </MainSplit>

      <CommitPanel>
          <textarea />
          <CommitButton />
      </CommitPanel>

  </RepositoryScreen>

  <DialogLayer />

  <ErrorLayer />

</App>
```

---

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

MVP 先做单个 Dark Theme。

建议 tokens：

```ts
export const theme = {
  bg: '#18181b',
  panel: '#202024',
  panelHover: '#29292e',

  border: '#303036',

  text: '#f4f4f5',
  textMuted: '#a1a1aa',

  accent: '#7c8cff',

  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};
```

具体颜色允许实现阶段调整。

不要将颜色散落在 Component 中。

---

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

至少一个 happy-path：

```text
create local repo
checkout
modify file
launch app state
refresh
select file
diff visible
commit
status becomes clean
history includes commit
```

---

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
keyboard shortcuts
empty states
error classification
screenshot tests
integration tests
packaging
```

---

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
