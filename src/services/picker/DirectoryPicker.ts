export interface DirectoryPicker {
  pickDirectory(options?: { title?: string }): Promise<string | null>;
}
