import { render } from '@gpuix/react';
import { App } from './app/App';
import { handleWindowKeyDown } from './app/shortcuts';
import { layout } from './app/theme';

const preview = process.env.SVN_GPUIX_PREVIEW;
const previewPage = preview === 'history' ? 'history' : preview === 'changes' ? 'changes' : undefined;

render(<App preview={previewPage} />, {
  title: 'Revision',
  appName: 'Revision',
  width: layout.windowWidth,
  height: layout.windowHeight,
  titlebarTransparent: true,
  trafficLightX: 16,
  trafficLightY: 14,
  onKeyDown: handleWindowKeyDown,
});
