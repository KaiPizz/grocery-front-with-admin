import type { ReactElement } from 'react';
import type { CuisineKey } from '@/lib/cuisines';

// Small inline flags for the cuisine cards. Emoji flags are not an option:
// Windows draws them as two letters. Simplified to read at ~28 px wide.

function star(cx: number, cy: number, r: number, turn = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.382;
    const angle = -Math.PI / 2 + turn + (i * Math.PI) / 5;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

function Trigram({ x, y, angle, broken }: { x: number; y: number; angle: number; broken: [boolean, boolean, boolean] }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
      {broken.map((split, row) => (split ? (
        <g key={row}>
          <rect x={-2} y={-1.6 + row * 1.2} width={1.7} height={0.8} />
          <rect x={0.3} y={-1.6 + row * 1.2} width={1.7} height={0.8} />
        </g>
      ) : (
        <rect key={row} x={-2} y={-1.6 + row * 1.2} width={4} height={0.8} />
      )))}
    </g>
  );
}

const FLAGS: Record<CuisineKey, ReactElement> = {
  japanese: (
    <>
      <rect width="36" height="24" fill="#fff" />
      <circle cx="18" cy="12" r="7.2" fill="#BC002D" />
    </>
  ),
  korean: (
    <>
      <rect width="36" height="24" fill="#fff" />
      <g transform="rotate(33.7 18 12)">
        <path d="M12 12a6 6 0 0 1 12 0z" fill="#CD2E3A" />
        <path d="M12 12a6 6 0 0 0 12 0z" fill="#0047A0" />
        <circle cx="15" cy="12" r="3" fill="#CD2E3A" />
        <circle cx="21" cy="12" r="3" fill="#0047A0" />
      </g>
      <Trigram x={7} y={5.5} angle={-56.3} broken={[false, false, false]} />
      <Trigram x={29} y={18.5} angle={-56.3} broken={[true, true, true]} />
      <Trigram x={29} y={5.5} angle={56.3} broken={[false, true, false]} />
      <Trigram x={7} y={18.5} angle={56.3} broken={[true, false, true]} />
    </>
  ),
  chinese: (
    <>
      <rect width="36" height="24" fill="#EE1C25" />
      <polygon points={star(6, 6, 3.6)} fill="#FFFF00" />
      <polygon points={star(12, 2.4, 1.2, 0.6)} fill="#FFFF00" />
      <polygon points={star(14.4, 4.8, 1.2, 0.3)} fill="#FFFF00" />
      <polygon points={star(14.4, 8.4, 1.2, 0)} fill="#FFFF00" />
      <polygon points={star(12, 10.8, 1.2, 0.5)} fill="#FFFF00" />
    </>
  ),
  thai: (
    <>
      <rect width="36" height="24" fill="#A51931" />
      <rect y="4" width="36" height="16" fill="#F4F5F8" />
      <rect y="8" width="36" height="8" fill="#2D2A4A" />
    </>
  ),
  vietnamese: (
    <>
      <rect width="36" height="24" fill="#DA251D" />
      <polygon points={star(18, 12.6, 6.6)} fill="#FFFF00" />
    </>
  ),
};

export function CuisineFlag({ cuisine, className }: { cuisine: CuisineKey; className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden="true" focusable="false" data-testid="showcase-cuisine-flag">
      {FLAGS[cuisine]}
    </svg>
  );
}
