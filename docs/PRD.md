# SVN GUI — Product Requirements Document

**Status:** Draft / MVP
**Target:** macOS ARM64
**UI Framework:** GPUIX + React + TypeScript
**Runtime:** Bun
**SVN Backend:** System `svn` CLI

---

# 1. 产品概述

## 1.1 背景

现有 SVN GUI 客户端普遍存在以下问题：

- 商业软件需要付费；
- 免费版本功能受限；
- 一些客户端长期缺乏维护；
- 部分客户端没有 Apple Silicon 原生版本；
- UI 设计陈旧、功能复杂；
- 日常开发实际只使用少量 SVN 功能。

本项目目标不是构建 SmartSVN、Cornerstone 等完整 SVN IDE，而是提供一个：

> 现代、快速、轻量、免费的日常 SVN GUI。

产品重点覆盖开发者日常最常用的 SVN working copy 操作。

---

# 2. 产品目标

MVP 必须完整支持以下工作流：

1. Checkout SVN Repository
2. 打开已有 SVN Working Copy
3. 查看 SVN Status
4. 查看 Changed Files
5. 查看文件 Diff
6. 勾选部分文件 Commit
7. 输入 Commit Message
8. SVN Update
9. Revert
10. Add
11. Delete
12. 查看 Log / History

目标是使用户无需 Terminal 即可完成日常 SVN 工作。

---

# 3. 非目标

MVP 不实现：

- Branch / Tag 管理
- Merge
- Switch
- Relocate
- Conflict Resolver
- Repository Browser
- Repository Administration
- SVN Server 管理
- Properties GUI
- Lock / Unlock
- Blame
- Shelve
- Changelist
- Graph / Revision Graph
- SSH Key 管理
- SVN 用户名密码管理
- 自定义 diff tool
- 多 repository 同窗口工作区
- 插件系统

这些功能未来根据实际使用情况决定是否增加。

---

# 4. 目标用户

主要目标用户：

- 软件开发人员
- 使用已有 SVN repository 的公司项目
- 日常 SVN 操作相对简单
- 希望使用现代 GUI
- 不希望购买完整 SVN 商业客户端
- Apple Silicon Mac 用户

典型使用模式：

```text
打开项目
    ↓
查看修改
    ↓
查看 Diff
    ↓
勾选文件
    ↓
填写 Commit Message
    ↓
Commit
```

以及：

```text
Update
↓
编辑代码
↓
Review Changes
↓
Commit
```

---

# 5. 产品设计原则

## 5.1 简单优先

用户进入 working copy 后立即看到 Changes。

不要：

- 首页 Dashboard
- Repository Tree
- Workspace 管理
- 大量工具栏按钮
- 多级配置菜单

---

## 5.2 Changes First

主要界面围绕：

```text
Changed Files + Diff + Commit
```

设计。

---

## 5.3 不重新发明 SVN

业务逻辑依赖用户系统中的：

```text
svn
```

应用本身仅负责：

- 执行命令
- 解析结果
- 展示 UI
- 管理用户操作流程

---

## 5.4 不模拟 Git

MVP 不提供：

- Stage
- Index
- Staged / Unstaged

用户通过 checkbox 选择本次需要提交的文件。

例如：

```text
Changes

☑ M src/App.ts
☑ M src/api.ts
☐ M README.md
```

执行：

```text
svn commit src/App.ts src/api.ts
```

---

# 6. 主界面

推荐默认布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ ProjectName      r128      Refresh       Update      History │
├───────────────────┬──────────────────────────────────────────┤
│ CHANGES           │ src/components/App.tsx                  │
│                   │                                          │
│ ☑ M App.tsx       │  10 │ const value = 1                   │
│ ☑ M api.ts        │ -11 │ const oldValue = 1                │
│ ☐ ? new-file.ts   │ +11 │ const newValue = 2                │
│   ! removed.ts    │                                          │
│                   │                                          │
│                   │                                          │
│                   │                                          │
├───────────────────┴──────────────────────────────────────────┤
│ Commit Message                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ fix: update user handling                                │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                            Commit 2 Files    │
└──────────────────────────────────────────────────────────────┘
```

推荐比例：

```text
Changed Files: 280–340px
Diff: flex-grow
Commit panel: 120–160px
```

---

# 7. 功能需求

## FR-01 打开 Working Copy

用户点击：

```text
Open Working Copy
```

应用允许选择一个目录。

选择后执行 SVN working copy 验证。

成功后进入主界面。

验证失败：

```text
This folder is not an SVN working copy.
```

不能进入 repository 页面。

---

## FR-02 Recent Working Copies

应用保存最近打开过的 working copy：

```text
Recent

Project A
~/Projects/project-a

Project B
~/Work/project-b
```

最多保存：

```text
10
```

条。

点击即可打开。

不存在的路径自动标记失效。

---

# 8. Checkout

用户点击：

```text
Checkout Repository
```

弹出 Checkout Dialog。

字段：

```text
Repository URL
Destination
```

例如：

```text
Repository URL
https://svn.example.com/project/trunk

Destination
/Users/user/Projects/project
```

按钮：

```text
Cancel
Checkout
```

执行期间：

```text
Checking out…
```

展示简单进度输出。

成功：

```text
Checked out revision 128.
```

随后自动打开新 working copy。

失败：

显示 SVN stderr。

---

# 9. SVN Status

打开 repository 后执行：

```text
svn status
```

并生成 Changes List。

支持状态：

| SVN 状态    | UI  |
| ----------- | --- |
| modified    | M   |
| added       | A   |
| deleted     | D   |
| unversioned | ?   |
| missing     | !   |
| replaced    | R   |
| conflicted  | C   |
| ignored     | I   |
| external    | X   |

MVP 默认隐藏：

```text
ignored
external
normal
```

---

# 10. Changed Files

左侧展示所有 working copy change。

每行：

```text
Checkbox
Status
Filename
Relative Path
```

例如：

```text
☑ M App.tsx
    src/components/App.tsx
```

排序优先级：

1. path
2. filename

文件夹不单独构建 tree。

MVP 使用 flat list。

---

# 11. Checkbox 规则

默认：

```text
Modified       checked
Added          checked
Deleted        checked
Missing        unchecked
Unversioned    unchecked
Conflicted     unchecked
```

原因：

`?` 文件未经 `svn add` 不应该直接进入 commit。

Missing 文件未经确认也不应该自动 schedule delete。

---

# 12. 文件选择

点击 Changed File：

```text
select file
```

与：

```text
checkbox
```

是两个独立动作。

点击 row：

```text
打开 Diff
```

点击 checkbox：

```text
改变 Commit Selection
```

避免类似：

```text
点击文件 = 自动加入提交
```

这种隐式行为。

---

# 13. Diff

点击 Modified / Added / Deleted 文件：

右侧显示 Unified Diff。

Modified：

```text
base → working copy
```

Added：

展示新文件内容。

Deleted：

展示删除内容。

Unversioned：

显示：

```text
Unversioned file

Add this file to SVN to include it in a commit.
```

并提供：

```text
Add
```

按钮。

Binary File：

显示：

```text
Binary file changed
Diff preview is unavailable.
```

---

# 14. Commit Message

底部固定 Commit Panel。

包含：

```text
Commit Message textarea
Commit button
Selected file count
```

例如：

```text
Commit 3 Files
```

Commit Message 必须非空。

空 message 时 Commit disabled。

---

# 15. Commit

Commit 前显示：

```text
3 files selected
```

提交过程中：

```text
Committing…
```

禁止：

- 再次 Commit
- Update
- Revert
- Add
- Delete

成功后：

```text
Committed revision 129
```

并：

1. 清空 Commit Message
2. 清空 selection
3. Refresh Status
4. Refresh repository revision

---

# 16. Update

Toolbar：

```text
Update
```

执行整个 Working Copy：

```text
svn update
```

操作期间：

```text
Updating…
```

成功后：

```text
Updated to revision 130
```

随后：

```text
Refresh Status
```

---

# 17. Revert

Changed File context action：

```text
Revert
```

也允许多选文件后：

```text
Revert Selected
```

必须弹确认：

```text
Revert 3 files?

Local modifications will be permanently discarded.

Cancel
Revert
```

Revert 成功后自动刷新。

---

# 18. Add

对：

```text
Unversioned ?
```

文件显示：

```text
Add
```

执行后：

状态变为：

```text
A
```

并默认 checked。

---

# 19. Delete

对于版本控制中的文件：

```text
Delete
```

弹确认：

```text
Delete "foo.ts"?

The file will be removed from disk and scheduled for deletion in SVN.

Cancel
Delete
```

成功后：

```text
D foo.ts
```

---

# 20. Missing File

对于：

```text
! foo.ts
```

提供：

```text
Mark as Deleted
```

执行 SVN delete，使：

```text
!
```

转换为：

```text
D
```

---

# 21. History

Toolbar：

```text
History
```

打开 History View。

页面：

```text
┌────────┬───────────────┬────────────────┬────────────────────┐
│ Rev    │ Author        │ Date           │ Message            │
├────────┼───────────────┼────────────────┼────────────────────┤
│ r130   │ alice         │ 2 min ago      │ Fix API            │
│ r129   │ bob           │ Yesterday      │ Update config      │
│ r128   │ alice         │ Aug 29         │ Initial version    │
└────────┴───────────────┴────────────────┴────────────────────┘
```

默认加载：

```text
100 revisions
```

未来可以增加 pagination。

点击 revision：

右侧 Detail：

```text
Revision
Author
Date
Commit Message
Changed Paths
```

MVP 不要求 revision diff。

---

# 22. Refresh

Toolbar 提供：

```text
Refresh
```

刷新：

```text
svn status
svn info
```

文件操作完成后自动 Refresh。

---

# 23. Repository 信息

Topbar 显示：

```text
Working Copy Name
Revision
```

Tooltip / secondary text 可显示：

```text
Repository URL
Local Path
```

---

# 24. Welcome Screen

没有打开 repository 时：

```text
SVN

A simple SVN client.

[ Open Working Copy ]
[ Checkout Repository ]

Recent
────────────────────

project-a
~/Projects/project-a

project-b
~/Work/project-b
```

不增加其他功能。

---

# 25. Loading State

长操作：

```text
Checkout
Update
Commit
```

必须有明确运行状态。

例如：

```text
Updating working copy…
```

禁止整个窗口假死。

---

# 26. Error Handling

SVN command failure 统一使用 Error Banner / Dialog。

包含：

```text
Operation
Human readable message
Original SVN output
```

例如：

```text
Update failed

Working copy is locked.

svn: E155004: Working copy ...
```

高级信息默认折叠：

```text
Show Details
```

---

# 27. Authentication

MVP 不实现 credentials UI。

使用系统 SVN 已保存 credentials。

如果需要登录：

```text
Authentication required.

Authenticate using the SVN command line first, then retry.
```

应用：

- 不保存 password；
- 不保存 SSH private key；
- 不绕过 SSL certificate validation。

---

# 28. 操作互斥

以下写操作不能同时执行：

```text
checkout
commit
update
revert
add
delete
```

同时只能存在一个 mutating SVN operation。

读取操作：

```text
status
diff
info
log
```

可以异步执行，但 Diff 请求必须支持取消旧请求。

---

# 29. Keyboard Shortcuts

MVP：

```text
Cmd+O        Open Working Copy
Cmd+Shift+O  Checkout
Cmd+R        Refresh
Cmd+Enter    Commit
Esc          Close dialog
```

Commit shortcut 仅当：

```text
message != empty
selected files > 0
no operation running
```

时有效。

---

# 30. 性能目标

典型 Working Copy：

```text
< 10,000 files
< 500 changed files
```

要求：

Status 完成后 UI：

```text
< 100ms
```

展示 Changed Files。

Diff 切换文件后立即显示 Loading。

不要因为读取 Diff 阻塞主线程。

Changed Files 使用 virtual list。

---

# 31. 数据持久化

MVP 仅保存：

```text
recentWorkingCopies
lastWorkingCopy
window size
```

不保存：

```text
commit message
password
SVN output
diff
repository content
```

---

# 32. MVP Definition of Done

只有满足以下条件，才认为 MVP 完成：

- 可以 checkout repository
- 可以打开 working copy
- 可以识别非法 working copy
- 可以显示 changed files
- 可以查看 modified file diff
- 可以 add unversioned file
- 可以 delete versioned file
- 可以 revert
- 可以选择部分文件
- 可以 commit selected files
- 可以 update
- 可以查看最近 100 条 log
- 所有操作失败均不会导致应用崩溃
- SVN CLI 不存在时有明确错误
- macOS ARM64 可正常运行
- 核心 SVN parser 有自动化测试
- 核心 UI 有 screenshot tests
- README 包含运行方式

---

# 33. MVP 成功标准

对于一个已经安装 SVN CLI 的开发者，从第一次启动到完成：

```text
Open Working Copy
→ Review Diff
→ Select Files
→ Commit
```

整个过程中不需要打开 Terminal。

除首次 SVN authentication 外，日常工作均可在 GUI 内完成。
