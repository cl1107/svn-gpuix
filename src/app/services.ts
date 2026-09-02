import { OperationManager } from '../application/operationManager';
import { MacOSDirectoryPicker } from '../services/picker/macosDirectoryPicker';
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
}

export function createAppServices(): AppServices {
  const runner = new CommandRunner();
  return {
    runner,
    svn: new CliSvnClient(runner),
    picker: new MacOSDirectoryPicker(runner),
    settings: new SettingsRepository(defaultSettingsPath()),
    operations: new OperationManager(),
  };
}
