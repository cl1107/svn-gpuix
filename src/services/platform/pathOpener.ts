export interface PathOpener {
  openPath(path: string): Promise<void>;
}
