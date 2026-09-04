import appIconSvg from '../../assets/app-icon.svg' with { type: 'text' };

export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <div
      testId="brand-mark"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <svg source={appIconSvg} style={{ width: size, height: size }} />
    </div>
  );
}
