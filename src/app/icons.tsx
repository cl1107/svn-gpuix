/** 单色 SVG，通过 style.color 着色。 */
export const icons = {
  logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="17" text-anchor="middle" font-size="14" font-family="SF Pro Text" font-weight="700" fill="#000">R</text></svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M10.4 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5A2 2 0 0 0 20 6.5h-8.2L10.4 4z"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M11 3h2v10.2l3.6-3.6 1.4 1.4L12 17.6 6 11l1.4-1.4L11 13.2V3zm-7 16h16v2H4v-2z"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M10 3a7 7 0 015.6 11.2l4.1 4.1-1.4 1.4-4.1-4.1A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z"/></svg>`,
  changes: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z"/></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M13 3a9 9 0 11-9 9h2a7 7 0 107-7V3zm-1 4h2v5h-4V9h2V7z"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M8 4h10a2 2 0 012 2v12h-2V6H8V4zM4 8h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2zm0 2v10h10V10H4z"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"/></svg>`,
  revert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M12 5V2L7 7l5 5V9a5 5 0 11-5 5H5a7 7 0 107-9z"/></svg>`,
} as const;

export function Icon({
  name,
  size = 16,
  color,
}: {
  name: keyof typeof icons;
  size?: number;
  color: string;
}) {
  return (
    <svg
      source={icons[name]}
      style={{ width: size, height: size, flexShrink: 0, color }}
    />
  );
}
