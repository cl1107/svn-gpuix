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

核心页面可用 fixture 数据直接预览：

```bash
bun run dev:changes
bun run dev:history
bun run dev:working-copy
```

## 构建

```bash
bun run build
```

在 macOS 上会同时生成：

- `dist/revision`：standalone Bun binary
- `dist/Revision.app`：带 Revision 应用图标的 macOS app bundle

应用图标的可编辑源文件是 `assets/app-icon.svg`。构建时使用 macOS 原生 AppKit 渲染 1024px master PNG，再通过 `sips` / `iconutil` 生成 `AppIcon.icns`；不需要额外图形依赖。若只需要原来的裸 binary，可运行 `bun run build:bin`。

阶段 9 验收：

```bash
bun run typecheck
bun test
bun run build
```
