# svn-gpuix

现代、快速、轻量的 macOS SVN GUI。

面向开发者日常 working copy 操作：Checkout、Status、Diff、Commit、Update、Revert、Add、Delete、Log。基于 GPUIX + React + TypeScript，运行时使用 Bun，后端调用系统 `svn` CLI。目标平台为 macOS ARM64。

当前仓库以产品文档为起点，正在按 [tasks.md](tasks.md) 实现 MVP。

- [产品需求](docs/PRD.md)
- [功能规格](docs/Spec.md)
- [架构设计](docs/ArchitectureDesign.md)
- [代理约定](AGENTS.md)

## 运行

需要：macOS ARM64、[Bun](https://bun.sh)、系统 `svn`（`brew install subversion`）。

```bash
bun install
bun run dev
```

Welcome 上点 **Choose folder…**（或 `Cmd+O`）打开已有 working copy。非法目录会留在 Welcome 并显示错误。最近打开的路径写在 `~/Library/Application Support/Revision/settings.json`，最多 10 条。

对照 Figma 的 Changes / History 视觉稿（仍用 fixture 数据）：

```bash
bun run dev:changes
bun run dev:history
```

其他：

```bash
bun run typecheck
bun test
```
