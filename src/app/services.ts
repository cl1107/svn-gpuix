import { OperationManager } from '../application/operationManager';
import { MacOSDirectoryPicker } from '../services/picker/macosDirectoryPicker';
import { MacOSPathOpener } from '../services/platform/macosPathOpener';
import type { PathOpener } from '../services/platform/pathOpener';
import { defaultSettingsPath, SettingsRepository } from '../services/settings/settingsRepository';
import { CliSvnClient } from '../services/svn/SvnClient';
import { CommandRunner } from '../services/svn/commandRunner';
import type { DirectoryPicker } from '../services/picker/DirectoryPicker';

export interface AppServices {
  runner: CommandRunner;
  svn: CliSvnClient;
  picker: DirectoryPicker;
  settings: SettingsRepository;
  operations: OperationManager;
  opener?: PathOpener;
}

export function createAppServices(): AppServices {
  const runner = new CommandRunner();
  return {
    runner,
    svn: new CliSvnClient(runner),
    picker: new MacOSDirectoryPicker(runner),
    settings: new SettingsRepository(defaultSettingsPath()),
    operations: new OperationManager(),
    opener: new MacOSPathOpener(runner),
  };
}
