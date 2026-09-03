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

Figma 设计稿以 **1440 × 960** 为基准画布。Working Copy 打开后，窗口采用：

```text
macOS Titlebar
+
Sidebar
+
Master / Detail
```

的桌面应用布局，而不是传统“顶部工具栏 + 左侧文件树 + 全宽底部提交栏”。

参考结构：

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●   Revision                                             macOS Titlebar │
├──────────────┬────────────────────────┬─────────────────────────────────────┤
│ Sidebar      │ Changes Pane           │ Diff Pane                           │
│ 238px        │ 396px                  │ flex                                │
│              │                        │                                     │
│ Workspace    │ Changes       Refresh  │ selected/file/path    Revert   …    │
│ Switcher     │ 6 files                │ Modified · +18 · -6                 │
│              │ [ Filter changed... ]  ├─────────────────────────────────────┤
│ Changes      │ ☑ Select all           │                                     │
│ History      │                        │ Unified Diff                        │
│ Working Copy │ ☑ M UserCard.vue       │                                     │
│              │ ☑ M user.ts            │                                     │
│ SVN          │ ☑ A profile.vue        │                                     │
│ r18427       │ ...                    │                                     │
│ Up to date   │                        │                                     │
│ [ Update ]   │ ─────────────────────  │                                     │
│              │ Commit                 │                                     │
│ Quick actions│ [ Commit message... ]  │                                     │
│              │ [ Commit 6 files ]     │                                     │
└──────────────┴────────────────────────┴─────────────────────────────────────┘
```

### 6.1 Titlebar

窗口顶部保留约 **44px** 的 macOS 原生窗口区域：

- 左侧为 traffic-light window controls；
- 展示产品名称 `Revision`；
- 允许放置少量**应用级**入口：`Open working copy`、`Welcome screen` 与 Appearance（Light / Dark / System）；
- 不承载当前 Working Copy 的 Refresh / Update / History 等仓库级业务操作。

仓库级操作继续放在 Sidebar 或对应内容 Pane 内。Titlebar 只承担应用 chrome 与跨 Working Copy 的入口，避免与页面级操作重复。
### 6.2 Sidebar

Working Copy 页面固定显示约 **238px** 宽的 Sidebar。

自上而下包含：

1. **Workspace Switcher**
   - Working Copy 名称；
   - 本地路径；
   - 切换入口。
2. **Workspace Navigation**
   - Changes；
   - History；
   - Working Copy。
3. **SVN Update Card**
   - 当前 revision；
   - working copy 状态；
   - Update 按钮。
4. **Quick actions**
   - Add unversioned files；
   - Revert selected；
   - More SVN actions。
5. 底部 SVN CLI 版本信息。

Sidebar 负责导航和 working copy 级操作，不承担 Changed Files 列表。

### 6.3 Changes / Diff 主工作区

`Changes` 页面为三栏结构：

| 区域 | Figma 参考宽度 | 说明 |
| --- | ---: | --- |
| Sidebar | 238px | 固定 |
| Changed Files Pane | 396px | 固定 / 可在适配时小幅调整 |
| Diff Pane | 804px @ 1440px | flex-grow |

Changed Files Pane 内部从上到下为：

```text
Page Header
File count + Refresh
Search
Select all / selected count
Changed Files list
Divider
Commit composer
```

Commit composer **属于中间 Changes Pane**，不再作为横跨整个窗口的底部固定面板。

Diff Pane 为主要弹性区域，顶部包含当前文件信息和文件级操作，下面展示 diff 内容。

### 6.4 History 主工作区

切换到 `History` 后保留同一 Sidebar，中间和右侧切换为：

```text
Sidebar 238px
+
Revision List 454px
+
Revision Detail 746px @ 1440px
```

即 Changes 与 History 共用统一的 `Sidebar + List + Detail` 信息架构。

### 6.5 分隔与滚动

- Sidebar / List / Detail 之间使用 1px 分隔线；
- Changed Files / Revision List 独立滚动；
- Diff / Revision Detail 独立滚动；
- 窗口缩放时优先让右侧 Detail 区域伸缩，中间列表保持稳定可读宽度。
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

Changed Files 位于主界面的 **中间 Changes Pane**，左侧 Sidebar 仅用于 workspace 导航和 SVN 操作。

Pane 顶部包含：

```text
Changes
6 files                      Refresh

[ Filter changed files ]

☑ Select all                 6 selected
────────────────────────────────────
```

文件列表使用 flat list，不构建 folder tree。

每行视觉结构：

```text
Checkbox
Status Badge
Relative Path
Status Label
Disclosure / selection affordance
```

例如：

```text
☑  M  src/components/UserCard.vue
      Modified

☑  A  src/pages/profile.vue
      Added
```

状态使用紧凑 Badge（`M / A / D / ? / ! / R / C`），路径作为主信息，状态名称作为 secondary text。

排序优先级：

1. path
2. filename

点击文件行后，在右侧 Diff Pane 展示该文件内容；checkbox 仍只控制本次 Commit Selection。
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

Commit 区域嵌入 **Changes Pane 下半部**，位于 Changed Files list 之后，通过 divider 与文件列表分隔。

它不是横跨主窗口的固定底栏。

布局：

```text
────────────────────────────────────
Commit

┌──────────────────────────────────┐
│ Fix profile avatar fallback...   │
│                                  │
│ Optional details…     ⌘↵ commit  │
└──────────────────────────────────┘

[          Commit 6 files          ]

Commits to current working copy only
```

Figma 参考：

- 中栏左右 padding：20px；
- Commit Message：约 120px 高；
- Commit Button：中栏内全宽，约 42px 高；
- 快捷键提示位于输入区域右下角。

包含：

```text
Commit Message textarea
Keyboard shortcut hint
Commit button
Selected file count
Secondary helper text
```

例如：

```text
Commit 3 Files
```

Commit Message 必须非空。

空 message 时 Commit disabled。

切换到 History 等其他 Sidebar 页面时，整个中间 Pane 被对应内容替换，因此 Commit 区域不显示。
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

Update 不放在全局 Toolbar，而放在 Sidebar 的 **SVN Update Card** 中。

布局示例：

```text
SVN

┌────────────────────────┐
│ Working copy           │
│ r18427       [ Update ]│
│ Up to date             │
└────────────────────────┘
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

Update Card 中的 revision 和状态同步更新。
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

History 通过 Sidebar 中的：

```text
History
```

进入，不通过顶部 Toolbar 打开独立页面。

History 沿用主界面的三栏结构：

```text
┌──────────────┬───────────────────────────┬──────────────────────────────────┐
│ Sidebar      │ Revision List             │ Revision Detail                  │
│ 238px        │ 454px                     │ flex / 746px @ 1440              │
│              │                           │                                  │
│ Changes      │ History          Refresh  │ r18431              Copy revision│
│ History      │ Repository revisions      │ author · date                    │
│ Working Copy │                           │                                  │
│              │ [ Search history... ]     │ Commit message                   │
│ SVN Update   │ [All] [My] [Branch]       │ ...                              │
│              │                           │                                  │
│              │ r18431  message           │ Changed Paths                    │
│              │ author   date             │ M / A / D path                   │
│              │                           │                                  │
│              │ r18430  message           │ Revision info                    │
│              │ ...                       │ Revision / Author / Repository   │
└──────────────┴───────────────────────────┴──────────────────────────────────┘
```

### 21.1 Revision List

中间 Revision List 顶部包含：

- `History` 标题；
- `Repository revisions` secondary text；
- Refresh；
- 搜索框；
- 设计稿中的紧凑 filter chips；
- revision 列表。

每条 revision 使用列表卡片呈现，而不是传统多列表格。

主要信息：

```text
Revision
Author
Date
Commit Message
```

默认加载：

```text
100 revisions
```

未来可以增加 pagination。

### 21.2 Revision Detail

点击 revision 后，右侧 Revision Detail 展示：

```text
Revision header
Author
Date
Copy revision action

Commit Message

Changed Paths

Revision Info
- Revision
- Author
- Repository
```

Changed Paths 使用状态 Badge + path 的列表形式。

MVP 不要求 revision diff。
---

# 22. Refresh

Refresh 为当前内容 Pane 的上下文操作，不使用全局 Toolbar。

Changes 页面：

```text
Changes                           Refresh
6 files
```

刷新：

```text
svn status
svn info
```

History 页面在 Revision List Header 的相同位置提供 Refresh，以保持页面结构一致。

文件操作完成后自动 Refresh。
---

# 23. Repository 信息

Repository / Working Copy 信息主要分布在 Sidebar，而不是窗口 Topbar。

### 23.1 Workspace Switcher

Sidebar 顶部展示：

```text
Working Copy Name
Local Path
```

例如：

```text
frontend-web
~/work/frontend-web
```

### 23.2 SVN Update Card

显示：

```text
Working copy
Revision
Sync status
Update
```

例如：

```text
r18427
Up to date
```

### 23.3 Detail

Sidebar 只保留高频摘要；更完整的信息进入 `Working Copy` 页面。

Working Copy 页面展示：

```text
Working Copy
- Name
- Local Path

Repository
- Repository URL
- Repository Root
- Repository UUID

Status
- Revision
- Local change count / status summary
- SVN CLI version
```

页面提供 `Refresh` 与 `Update`，二者复用 Changes 页相同的 repository refresh / mutation 流程，不维护第二份 working-copy 状态。

该页面是信息概览，不扩展成 Repository Browser、branch/tag 管理或服务器端目录浏览器。
# 24. Welcome Screen

没有打开 Working Copy 时，不显示 Working Copy Sidebar。

Titlebar 下方使用全宽 Welcome Shell：

```text
┌──────────────────────────────────────────────────────────────┐
│ ● ● ●   Revision                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    A focused SVN client                      │
│   Open an existing working copy, or check out a repository   │
│                                                              │
│       ┌────────────────────┐   ┌────────────────────┐         │
│       │ Open working copy  │   │ Checkout repository│         │
│       │                    │   │                    │         │
│       │ [ Choose folder… ] │   │ [ Checkout… ]     │         │
│       └────────────────────┘   └────────────────────┘         │
│                                                              │
│       Recent working copies                                  │
│       ┌──────────────────────────────────────────────┐        │
│       │ frontend-web       r18427   Up to date      │        │
│       │ ~/work/frontend-web                         │        │
│       ├──────────────────────────────────────────────┤        │
│       │ admin-console      r9931    3 local changes │        │
│       │ ~/work/admin-console                        │        │
│       └──────────────────────────────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

参考布局：

- 主内容最大宽度约 820px，并居中；
- `Open working copy` 与 `Checkout repository` 两张 action card 横向并列；
- 单卡参考宽度约 390px；
- Recent Working Copies 位于 action cards 下方；
- Recent item 展示项目名、本地路径、revision 与 working copy 状态；
- 点击 Recent item 直接打开对应 Working Copy。

Figma 画布底部还放置了 `Checkout preview` 用于展示 Repository URL / Local Path / Configure 的视觉样式；实际 Checkout 流程仍按第 8 节以 Checkout Dialog 承载，不作为 Welcome Screen 常驻模块。

不增加 Dashboard、Repository Browser 等额外首页模块。
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
