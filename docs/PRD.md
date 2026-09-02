# Revision — Product Requirements Document

**Version:** 0.2  
**Status:** Implementation-aligned MVP  
**Last updated:** 2026-09-02  
**Target:** macOS ARM64  
**UI:** GPUIX + React + TypeScript  
**Runtime:** Bun  
**SVN backend:** System `svn` CLI

---

# 1. 产品定位

Revision 是一个现代、轻量、面向日常开发工作流的 macOS SVN GUI。

它不试图覆盖 SmartSVN / Cornerstone 一类完整 SVN IDE 的全部能力，而是优先把高频 working copy 操作做得直接、清晰、可预测：

```text
Open / Checkout
→ Review Changes
→ Inspect Diff
→ Select Files
→ Commit
```

以及：

```text
Update
→ Edit
→ Review
→ Commit
```

核心原则：

- Changes first；
- 不模拟 Git staging/index；
- 使用系统 SVN CLI，不内置 SVN 实现；
- 单 working copy、单窗口；
- 操作明确，破坏性行为必须确认；
- UI 以 macOS 原生桌面应用体验为目标。

---

# 2. 当前 MVP 状态

截至 2026-09-02，初版已经完成以下主流程：

| 能力 | 状态 |
| --- | --- |
| 检测系统 SVN | 已实现 |
| 打开 working copy | 已实现 |
| Recent working copies | 已实现 |
| Checkout | 已实现 |
| Status / Changed Files | 已实现 |
| 文件筛选 / 选择 | 已实现 |
| Unified Diff | 已实现 |
| Commit | 已实现 |
| Update | 已实现 |
| Add | 已实现 |
| Delete / Missing → Delete | 已实现 |
| Revert | 已实现 |
| History / Log | 已实现 |
| Working Copy 详情页 | 占位，未实现 |
| Polish / 完整错误分类 / E2E / release build 验收 | 进行中 |

MVP 当前重点已经从“功能首次落地”转为“行为收敛、错误体验、快捷键、构建与验收”。

---

# 3. 非目标

当前版本明确不做：

- Branch / Tag 管理
- Merge
- Switch
- Relocate
- Conflict Resolver
- Repository Browser
- Repository Administration
- Properties GUI
- Lock / Unlock
- Blame
- Shelve
- Changelist
- Revision Graph
- 内置 SVN 凭据管理
- SSH Key 管理
- 自定义 diff tool
- filesystem watcher
- 多 repository 同窗口 workspace
- Git 支持
- Windows 支持
- 插件系统
- 遥测

这些能力只有在 MVP 稳定后、且有明确使用需求时再进入规划。

---

# 4. 目标用户

主要用户：

- 使用 SVN 维护公司或遗留项目的软件开发者；
- 日常需求集中在 update / status / diff / commit；
- 希望避免频繁使用 Terminal；
- 不需要复杂 SVN 管理能力；
- 使用 Apple Silicon Mac。

成功标准是：用户无需 Terminal 即可完成大多数日常 working copy 操作。

---

# 5. 信息架构

应用只有两个顶层状态：

```text
Welcome
Repository
```

Repository 内部使用 Sidebar 页面：

```text
Changes
History
Working Copy
```

当前 `Working Copy` 页面仅为占位，正式内容不属于已完成 MVP 功能。

## 5.1 Window / Titlebar

- 默认窗口：1440 × 960；
- 使用透明 macOS titlebar；
- 产品名：Revision；
- Titlebar 提供：
  - Open Working Copy；
  - Welcome Screen；
- 业务主操作仍放在对应页面，而不是构建传统大型工具栏。

## 5.2 Repository Shell

主界面统一为：

```text
Sidebar + List + Detail
```

Changes：

```text
Sidebar
+ Changed Files / Commit
+ Diff
```

History：

```text
Sidebar
+ Revision List
+ Revision Detail
```

这种结构是当前实现基准，旧文档中的“顶栏 + 全宽底部 Commit”不再适用。

---

# 6. Welcome

未打开 working copy 时展示 Welcome Screen。

主要入口：

- Open Working Copy
- Checkout Repository
- Recent Working Copies

启动时检测：

```bash
svn --version --quiet
```

若未找到 SVN，必须明确提示用户安装 Subversion 后重启应用。

## 6.1 Recent

- 最多保留 10 条；
- 最近打开的排最前；
- 保存绝对路径与最近打开时间；
- 不存在的路径显示 `Missing`；
- 点击 Recent 会重新验证 working copy；
- 成功打开后更新最近记录。

---

# 7. Open Working Copy

用户通过系统目录选择器选择目录。

验证使用：

```bash
svn info --xml
```

成功：

- 进入 Repository；
- 获取 repository URL / root / revision；
- 拉取 status；
- 写入 Recent。

失败：

- 非 working copy：显示 `This folder is not an SVN working copy.`；
- 目录不存在：显示 missing working copy 错误；
- 不进入 Repository。

快捷键：

```text
⌘O
```

---

# 8. Checkout

Checkout Dialog 字段：

- Repository URL
- Destination

执行：

```bash
svn checkout URL DEST --non-interactive
```

行为：

- 执行期间显示最新 stdout 行；
- 成功后验证并自动打开新 working copy；
- 自动写入 Recent；
- 失败展示 SVN 错误；
- 认证失败不提供内置登录 UI，提示用户先在 Terminal 完成 SVN 认证。

快捷键：

```text
⌘⇧O
```

---

# 9. Status / Changed Files

状态读取：

```bash
svn status --xml --ignore-externals
```

支持状态：

| SVN | UI | 默认勾选 | 可直接提交 |
| --- | --- | --- | --- |
| modified | M | 是 | 是 |
| added | A | 是 | 是 |
| deleted | D | 是 | 是 |
| replaced | R | 是 | 是 |
| unversioned | ? | 否 | 否 |
| missing | ! | 否 | 否 |
| conflicted | C | 否 | 否 |
| obstructed | O | 否 | 否 |
| incomplete | ~ | 否 | 否 |
| ignored | I | 隐藏 | 否 |
| external | X | 隐藏 | 否 |

Changed Files：

- flat list，不构建文件树；
- 可按路径文本筛选；
- 排序按目录后文件名；
- row selection 与 commit checkbox 独立；
- Refresh 后尽量保留用户原选择；
- 新出现的 M/A/D/R 自动按默认规则勾选。

Sidebar 状态文案基于**本地变更数量**：

- 无本地变更：`Up to date`
- 有变更：`N local changes`

当前没有执行 `svn status -u`，因此这不是远端同步状态判断。

---

# 10. Diff

选择 Changed File 后加载右侧 Diff。

文本文件：

```bash
svn diff --git -- PATH
```

结果分为：

- text
- binary
- unversioned

要求：

- 切换文件时立即进入 loading；
- 新请求取消旧请求；
- 旧请求结果不得覆盖新选中文件；
- Refresh / mutation 后 diff cache 失效。

Unversioned：

- 不调用 SVN diff；
- 显示“未纳入版本控制”空态；
- 提供 Add。

Binary：

- 显示 binary changed；
- 不尝试文本预览。

当前 MVP 不提供 side-by-side diff、hunk staging 或外部 diff tool。

---

# 11. Commit

Commit composer 位于 Changes Pane 底部，不横跨整个窗口。

内容：

- Commit Message
- 当前可提交文件数量
- Commit button
- `⌘↵` 提示

可提交条件：

- message trim 后非空；
- 至少一个勾选项属于 M/A/D/R；
- 当前没有 mutation 正在执行。

执行：

```bash
svn commit --non-interactive -m MESSAGE -- PATHS
```

成功后：

1. 清空 commit message；
2. 清空 selection；
3. Refresh repository info + status；
4. 更新 revision；
5. diff cache 失效。

失败后：

- 保留 message；
- 保留 selection；
- 显示错误。

快捷键：

```text
⌘Enter
```

---

# 12. Working Copy Mutations

所有 mutation 共享单一操作锁，同一时间只能执行一个：

- commit
- update
- add
- delete
- revert
- checkout

mutation 期间禁用其它 destructive / write 操作。

## 12.1 Update

执行整个 working copy：

```bash
svn update --non-interactive
```

- Sidebar Update Card 触发；
- 显示最新 stdout 行；
- 成功后自动 Refresh。

## 12.2 Add

仅针对 unversioned：

```bash
svn add --parents -- PATHS
```

入口：

- Diff 空态单文件 Add；
- Sidebar Add unversioned files。

Add 成功后目标文件保持勾选，便于继续 commit。

## 12.3 Revert

只允许文件，不对目录执行递归 revert。

执行前必须确认：

```text
Local modifications will be permanently discarded.
```

支持：

- 当前文件；
- 已勾选的可 revert 文件。

## 12.4 Delete

版本控制中的可删除项执行 SVN delete。

执行前必须确认。

Missing 文件使用 force delete，将 `!` 转为 SVN scheduled deletion：

```bash
svn delete --force -- PATH
```

当前 UI 中 Sidebar 提供 Delete selected，Diff header 也提供单文件 Delete。

---

# 13. History

History 是 Repository Shell 内的 Sidebar 页面。

读取：

```bash
svn log --xml -v -l 100 -r HEAD:1 -- .
```

说明：

- 默认最多 100 条；
- 范围针对当前 working copy URL；
- 使用 `HEAD:1` 避免 mixed-revision working copy 默认 BASE 范围漏掉新 revision。

Revision List：

- revision；
- 首行 commit message；
- author；
- date；
- 文本搜索；
- Refresh。

搜索覆盖：

- message；
- author；
- revision。

Revision Detail：

- revision；
- author；
- date；
- 完整 commit message；
- changed paths；
- repository URL。

当前未实现：

- My commits filter；
- Branch filter；
- revision diff；
- pagination。

这些不是当前 MVP 的验收阻塞项。

---

# 14. Working Copy 页面

Sidebar 已存在 `Working Copy` 导航项，但当前页面只展示占位文案。

因此本版本不应把以下能力描述为“已实现”：

- working copy 元数据详情；
- repository root / UUID 管理界面；
- cleanup；
- relocate；
- switch；
- properties。

是否补齐基础详情页，作为 MVP polish 后的独立小迭代决定。

---

# 15. 错误与认证

当前已覆盖：

- SVN CLI not found；
- not a working copy；
- missing recent path；
- authentication required；
- command failed；
- cancelled command。

认证策略：

- 所有 SVN write/network 命令使用 `--non-interactive`；
- Revision 不保存用户名密码；
- 遇到认证问题，提示用户先通过系统 SVN 在 Terminal 建立凭据。

待补齐：

- network；
- working copy locked；
- conflict 等错误的更细分类；
- Error Banner 的详情展示一致性。

---

# 16. 快捷键

当前实现：

| 快捷键 | 行为 |
| --- | --- |
| ⌘O | Open Working Copy |
| ⌘⇧O | Checkout |
| ⌘Enter | Commit |
| Esc | 关闭确认框 / workspace switcher 等可关闭 UI |

待补：

| 快捷键 | 行为 |
| --- | --- |
| ⌘R | Refresh 当前页面 |

---

# 17. 数据持久化

设置文件：

```text
~/Library/Application Support/Revision/settings.json
```

当前保存：

- recentWorkingCopies
- lastWorkingCopy
- 可选 window size

写入采用临时文件 + rename 的 atomic write。

不保存：

- SVN 密码；
- commit message draft；
- diff cache；
- history cache。

---

# 18. MVP Definition of Done

功能层面：

- [x] 可检测 SVN CLI
- [x] 可打开合法 working copy
- [x] 非 working copy 有明确错误
- [x] Recent 最多 10 条
- [x] Checkout 成功后自动打开
- [x] 可查看真实 Changed Files
- [x] 可筛选、选择文件
- [x] 可查看真实 diff
- [x] 可部分文件 commit
- [x] 可 Update
- [x] 可 Add
- [x] 可 Delete / Missing delete
- [x] 可 Revert
- [x] 可查看 100 条 History 与详情

Polish / release gate：

- [ ] Cmd+R
- [ ] 完整错误分类
- [ ] Error Banner / Show Details 收敛
- [ ] 核心 parser 与集成测试最终补齐
- [ ] 关键 UI screenshot 验收
- [ ] 至少一条 E2E happy path
- [ ] `bun run build` 的 unsigned macOS 开发构建验收

---

# 19. 后续优先级

MVP 完成后优先考虑：

1. Working Copy 基础详情；
2. History pagination；
3. 更完整错误恢复；
4. 可选系统通知 / 操作结果提示；
5. 用户真实使用反馈驱动的小功能。

Branch / merge / conflict editor 等复杂 SVN 能力不默认进入下一阶段。
