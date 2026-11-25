// `npm run verify` — prints the auto-generated weekly schedule for the demo seed data.
import { loadDemoData } from '../src/data/seedData';
import { calculateFairness, generateSchedule, getSwapCandidates } from '../src/utils/scheduler';
import { DAY_LABELS, DIRECTION_LABELS } from '../src/types';

const data = loadDemoData();
const rides = generateSchedule(data);
const parent = (id: string | null) => data.parents.find((p) => p.id === id)?.name ?? '⚠️ אין נהג';
const child = (id: string) => data.children.find((c) => c.id === id)?.name ?? id;
const inst = (id: string) => data.institutions.find((i) => i.id === id)?.name ?? id;

for (const r of rides) {
  console.log(
    `${DAY_LABELS[r.day].padEnd(6)} ${DIRECTION_LABELS[r.direction].padEnd(7)} ${r.time} | ${inst(r.institutionId).padEnd(16)} | ${parent(r.driverId).padEnd(11)} | ${r.passengerIds.map(child).join(', ').padEnd(18)} | ${r.assignmentReason}`,
  );
}
const f = calculateFairness(data.parents, rides);
console.log(`\nFairness: ${f.score}% (${f.label}) spread=${f.spread}`, data.parents.map((p) => `${p.name}:${f.counts[p.id]}`).join(' | '));
console.log(`Rides: ${rides.length}, conflicts: ${rides.filter((r) => !r.driverId).length}`);

const first = rides[0];
console.log(`\nSOS candidates for ${first.id} (current: ${parent(first.driverId)}):`);
for (const c of getSwapCandidates(data, rides, first.id)) {
  console.log(`  ${c.parent.name} — ${c.driveCount} נסיעות${c.hasOwnChild ? ' (+ ילד/ה בנסיעה)' : ''}`);
}
