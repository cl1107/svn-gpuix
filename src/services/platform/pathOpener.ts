export interface PathOpener {
  /** 打开路径本身（working copy 根目录用这个）。 */
  openPath(path: string): Promise<void>;
  /** 在 Finder 中显示路径（文件级 Reveal，使用 `open -R`）。 */
  revealPaths(paths: readonly string[]): Promise<void>;
}
