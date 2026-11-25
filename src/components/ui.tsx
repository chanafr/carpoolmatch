import type { Institution, Parent } from '../types';

// Text colors paired with the avatar backgrounds from the design export.
const AVATAR_TEXT: Record<string, string> = {
  '#CCFBF1': '#115E59',
  '#E0E7FF': '#3730A3',
  '#FEF3C7': '#92400E',
  '#FCE7F3': '#9D174D',
  '#DCFCE7': '#166534',
  '#FFE4E6': '#9F1239',
};

/** Hebrew count of weekly drives with correct singular/zero forms. */
export const drivesThisWeek = (n: number) =>
  n === 0 ? 'אין נסיעות השבוע' : n === 1 ? 'נסיעה אחת השבוע' : `${n} נסיעות השבוע`;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function Avatar({ parent, size = 32 }: { parent: Parent; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: parent.color,
        color: AVATAR_TEXT[parent.color.toUpperCase()] ?? '#0F172A',
      }}
    >
      {parent.name.trim().charAt(0)}
    </span>
  );
}

export function SchoolTag({ institution }: { institution: Institution | undefined }) {
  if (!institution) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{
        background: `color-mix(in srgb, ${institution.color} 12%, white)`,
        color: `color-mix(in srgb, ${institution.color} 65%, black)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: institution.color }} />
      {institution.name}
    </span>
  );
}
