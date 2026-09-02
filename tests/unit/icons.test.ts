import { describe, expect, test } from 'bun:test';
import { icons, lucideSource } from '../../src/app/icons';

describe('lucide icons', () => {
  test('把 currentColor 换成 #000，并去掉 license 注释', () => {
    const raw = `<!-- @license lucide-static -->\n<svg class="lucide" width="24" height="24" stroke="currentColor"></svg>`;
    expect(lucideSource(raw)).toBe('<svg stroke="#000"></svg>');
  });

  test('导出的图标都是可染色的 Lucide SVG', () => {
    for (const [name, source] of Object.entries(icons)) {
      expect(source.includes('currentColor'), name).toBe(false);
      expect(source.includes('viewBox="0 0 24 24"'), name).toBe(true);
      expect(source.includes('stroke="#000"'), name).toBe(true);
    }
  });
});
