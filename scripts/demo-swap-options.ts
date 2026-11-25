// `npx vite-node scripts/demo-swap-options.ts` — after the demo's "add רוני (ends 16:00)" step,
// lists every ride's best SOS replacement and the fairness score it would leave. Pick a high one to demo.
import { loadDemoData } from '../src/data/seedData';
import { addChild } from '../src/state/actions';
import { DAY_LABELS } from '../src/types';
import { applySwap, calculateFairness, generateSchedule, getSwapCandidates } from '../src/utils/scheduler';

let s = loadDemoData();
s = addChild(s, { name: 'רוני', parentId: 'p-yossi', institutionId: 'inst-alon', start: '08:00', end: '16:00' }, 'c-roni');
s = { ...s, rides: generateSchedule(s) };
const name = (id: string | null) => s.parents.find((p) => p.id === id)?.name.split(' ')[0] ?? '—';
console.log('Fairness after reschedule:', calculateFairness(s.parents, s.rides).score + '%');
const rows = s.rides.map((r) => {
  const best = getSwapCandidates(s, s.rides, r.id)[0];
  const after = best ? calculateFairness(s.parents, applySwap(s, s.rides, r.id, best.parent.id)).score : null;
  return { r, best, after };
}).sort((a, b) => (b.after ?? -1) - (a.after ?? -1));
for (const { r, best, after } of rows) {
  const inst = s.institutions.find((i) => i.id === r.institutionId)!.name;
  console.log(`${DAY_LABELS[r.day]} ${r.time} ${inst}: ${name(r.driverId)} → ${best ? name(best.parent.id) : '(none)'} ${after ?? ''}${after != null ? '%' : ''}`);
}
