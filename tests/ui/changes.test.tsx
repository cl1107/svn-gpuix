import { useState } from 'react';
import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { ChangesPanel } from '../../src/features/changes/ChangesPanel';
import type { WorkingCopyChange } from '../../src/domain/change';

const changes: WorkingCopyChange[] = [
  { path: 'src/a.ts', absolutePath: '/tmp/wc/src/a.ts', status: 'modified' },
  { path: 'scratch.txt', absolutePath: '/tmp/wc/scratch.txt', status: 'unversioned' },
];

function PanelHarness() {
  const [checkedPaths, setCheckedPaths] = useState(() => new Set(['src/a.ts']));
  const [selectedPath, setSelectedPath] = useState<string | null>('src/a.ts');
  return (
    <ChangesPanel
      changes={changes}
      checkedPaths={checkedPaths}
      selectedPath={selectedPath}
      commitMessage="msg"
      onSelect={setSelectedPath}
      onToggle={(path) => {
        setCheckedPaths((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }}
      onToggleAll={() => {}}
      onCommitMessage={() => {}}
      onCommit={() => {}}
      onRefresh={() => {}}
    />
  );
}

describe('ChangesPanel', () => {
  test('checkbox 与 row select 分离', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      render(<PanelHarness />);
      renderer.flush();
      expect(renderer.getAllText()).toContain('1 selected');
      const checkbox = renderer.findByTestId('check-scratch.txt');
      expect(checkbox).toBeTruthy();
      const bounds = renderer.getElementBounds(checkbox!.id);
      expect(bounds).toBeTruthy();
      const [x, y, w, h] = bounds as number[];
      renderer.nativeSimulateClick(x + w / 2, y + h / 2);
      renderer.flush();
      expect(renderer.getAllText()).toContain('2 selected');
      expect(renderer.getAllText()).toContain('src/a.ts');
    } finally {
      unmount();
    }
  });

  test('文件行拉满 Changes pane 宽度，不贴着文字收缩', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      render(<PanelHarness />);
      renderer.flush();
      const panel = renderer.findByTestId('changes-panel');
      const row = renderer.findByTestId('change-src/a.ts');
      expect(panel).toBeTruthy();
      expect(row).toBeTruthy();
      const panelBounds = renderer.getElementBounds(panel!.id);
      const rowBounds = renderer.getElementBounds(row!.id);
      expect(panelBounds).toBeTruthy();
      expect(rowBounds).toBeTruthy();
      if (!panelBounds || !rowBounds) return;
      const panelWidth = panelBounds[2];
      const rowX = rowBounds[0];
      const rowWidth = rowBounds[2];
      expect(rowWidth).toBeGreaterThan(360);
      expect(rowWidth).toBeGreaterThan(panelWidth - 24);
      expect(rowX).toBeGreaterThanOrEqual(0);
      expect(rowX).toBeLessThan(16);
    } finally {
      unmount();
    }
  });
});
