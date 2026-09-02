import chevronDownSvg from 'lucide-static/icons/chevron-down.svg' with { type: 'text' };
import chevronUpSvg from 'lucide-static/icons/chevron-up.svg' with { type: 'text' };
import copySvg from 'lucide-static/icons/copy.svg' with { type: 'text' };
import downloadSvg from 'lucide-static/icons/download.svg' with { type: 'text' };
import folderSvg from 'lucide-static/icons/folder.svg' with { type: 'text' };
import gitCompareSvg from 'lucide-static/icons/git-compare.svg' with { type: 'text' };
import historySvg from 'lucide-static/icons/history.svg' with { type: 'text' };
import houseSvg from 'lucide-static/icons/house.svg' with { type: 'text' };
import menuSvg from 'lucide-static/icons/menu.svg' with { type: 'text' };
import plusSvg from 'lucide-static/icons/plus.svg' with { type: 'text' };
import searchSvg from 'lucide-static/icons/search.svg' with { type: 'text' };
import trashSvg from 'lucide-static/icons/trash.svg' with { type: 'text' };
import undoSvg from 'lucide-static/icons/undo.svg' with { type: 'text' };

/** GPUIX 用 style.color 染色，SVG 里必须是 #000，不能写 currentColor。 */
export function lucideSource(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/\swidth="[^"]*"/g, '')
    .replace(/\sheight="[^"]*"/g, '')
    .replaceAll('currentColor', '#000')
    .trim();
}

export const icons = {
  folder: lucideSource(folderSvg),
  download: lucideSource(downloadSvg),
  search: lucideSource(searchSvg),
  changes: lucideSource(gitCompareSvg),
  history: lucideSource(historySvg),
  copy: lucideSource(copySvg),
  plus: lucideSource(plusSvg),
  revert: lucideSource(undoSvg),
  house: lucideSource(houseSvg),
  chevronDown: lucideSource(chevronDownSvg),
  chevronUp: lucideSource(chevronUpSvg),
  trash: lucideSource(trashSvg),
  menu: lucideSource(menuSvg),
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 16,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}>
      <svg source={icons[name]} style={{ width: size, height: size, color }} />
    </div>
  );
}
