// WhatsApp summary — format from scheduling_rules_data_specification.md §6.
import { DAYS, DAY_LABELS, DIRECTIONS } from '../types';
import type { AppState } from '../types';
import { calculateFairness } from './scheduler';

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const DIRECTION_EMOJI = { morning: '☀️', afternoon: '🌤️' } as const;

export function buildWhatsAppSummary(state: AppState): string {
  const f = calculateFairness(state.parents, state.rides);
  const counts = state.parents.map((p) => `${firstName(p.name)}: ${f.counts[p.id] ?? 0}`).join(' | ');
  const lines = [
    '🚗 *לוח הסעות שבועי — CarpoolMatch* 🚗',
    `⚖️ מדד הוגנות קבוצתי: ${f.label} ${f.score}% (${counts})`,
  ];

  for (const day of DAYS) {
    const dayRides = DIRECTIONS.flatMap((dir) =>
      state.rides
        .filter((r) => r.day === day && r.direction === dir)
        .sort((a, b) => a.time.localeCompare(b.time)),
    );
    if (dayRides.length === 0) continue;
    lines.push('', `📅 *יום ${DAY_LABELS[day]}*`);
    for (const r of dayRides) {
      const school = state.institutions.find((i) => i.id === r.institutionId)?.name ?? '';
      const driver = state.parents.find((p) => p.id === r.driverId);
      const kids = r.passengerIds
        .map((id) => state.children.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      const who = driver ? `נהג: ${firstName(driver.name)}` : '⚠️ אין נהג';
      lines.push(`${DIRECTION_EMOJI[r.direction]} ${r.time} | ${school} — ${who} (${kids})`);
    }
  }
  return lines.join('\n');
}

/** Clipboard with a fallback for non-secure contexts (e.g. opening the dev server on a phone via LAN IP). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
