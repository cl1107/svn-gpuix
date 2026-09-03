import { render } from '@gpuix/react';
import { App, type InitialAppearance } from './app/App';
import { createMacOSSystemAppearanceService, parseAppearancePreference } from './app/appearance';
import { createAppServices } from './app/services';
import { handleWindowKeyDown } from './app/shortcuts';
import { layout } from './app/theme';

const preview = process.env.SVN_GPUIX_PREVIEW;
const previewPage = preview === 'history' ? 'history' : preview === 'changes' ? 'changes' : preview === 'working-copy' ? 'working-copy' : undefined;
const services = createAppServices();

let initialAppearance: InitialAppearance;
if (preview) {
  initialAppearance = { preference: 'light', systemAppearance: 'light' };
} else {
  const settings = await services.settings.load();
  const preference = parseAppearancePreference(settings.appearance);
  const appearanceService = createMacOSSystemAppearanceService(services.runner);
  const systemAppearance = preference === 'system' ? await appearanceService.get() : 'light';
  initialAppearance = { preference, systemAppearance };
}

render(<App preview={previewPage} services={services} initialAppearance={initialAppearance} />, {
  title: 'Revision',
  appName: 'Revision',
  width: layout.windowWidth,
  height: layout.windowHeight,
  titlebarTransparent: true,
  trafficLightX: 16,
  trafficLightY: 14,
  onKeyDown: handleWindowKeyDown,
});
