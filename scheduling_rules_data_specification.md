# CarpoolMatch — Scheduling Rules, Fairness Math & Seed Data

## 1. Grouping Rules (Creating Ride Slots)
1. Iterate over all `days` (`Sun`, `Mon`, `Tue`, `Wed`, `Thu`) and `directions` (`Morning`, `Afternoon`).
2. Collect all children where `child.schedule[day].needsMorning` (for Morning) or `needsAfternoon` (for Afternoon) is `true`.
3. Group children into a single **Ride Need** if they share the exact same:
   - `day`
   - `direction`
   - `school`
   - `time` (`startTime` for Morning, `endTime` for Afternoon)
4. **Capacity Splitting:** If a Ride Need has more children than the largest available parent's `seatCapacity`, split the children into 2 separate `RideSlot`s (keeping siblings together when possible).

## 2. Driver Assignment Algorithm (Greedy Fairness)
Initialize `driveCount[parentId] = 0` for all parents.
For each `RideSlot`, find all **Eligible Parents** who meet ALL 3 conditions:
1. **Available:** `parent.availability[day][direction] === true`.
2. **Capacity:** `parent.seatCapacity >= rideSlot.passengerIds.length`.
3. **No Time Conflict:** The parent is NOT already assigned to another `RideSlot` on the exact same `day` and `time`.

### Ranking Eligible Parents (Tie-Breakers in Order):
1. **Lowest `driveCount`** (Primary fairness rule).
2. **Own Child Bonus:** Prefer a parent whose own child is in `rideSlot.passengerIds`.
3. **Alphabetical / Stable ID** (for deterministic results).

### Assignment Output:
- If an eligible parent is found:
  - Set `rideSlot.driverId = selectedParent.id`.
  - Increment `driveCount[selectedParent.id] += 1`.
  - Generate `assignmentReason` in Hebrew, e.g.:
    - `"איזון עומס (2 נסיעות) + הילד/ה בנסיעה"`
    - `"איזון עומס (נסיעה ראשונה השבוע)"`
- If NO eligible parent is found:
  - Set `rideSlot.driverId = null`.
  - Set `assignmentReason = "אין הורה פנוי עם מספיק מקומות ברכב"`.
  - UI must display this card in a clear **Conflict (Red)** state.

## 3. Fairness Score Formula (Transparent & Simple)
- Each assigned ride (Morning or Afternoon) equals **1 point** (equal weight).
- Let `counts` be the array of weekly drive counts for all active parents.
- `maxDrives = Math.max(...counts)`
- `minDrives = Math.min(...counts)`
- `spread = maxDrives - minDrives`
- **Fairness Percentage:**
  - If total assigned rides === 0, return `100%`.
  - Otherwise: `Math.max(0, Math.round(100 - (spread / Math.max(1, maxDrives)) * 50))`
  - *Example:* If parents have `[3, 3, 2, 3]` drives → `spread = 1`, `max = 3` → **83%–96%** (or display badge: `מאוזן מאוד` when `spread <= 1`, `סביר` when `spread === 2`, `דורש איזון` when `spread >= 3`).

## 4. Emergency SOS Swap Rules
When a user clicks **"לא יכול להסיע / החלפה"** on a `RideSlot`:
1. Filter all parents (excluding the current `driverId`) using the exact same 3 **Eligible Parent** conditions (Available + Capacity + No Time Conflict).
2. Sort candidates by lowest current `driveCount`.
3. Display each candidate in the modal with their name and current weekly drive count (e.g., `"מיכל — פנויה (2 נסיעות השבוע)"`).
4. When a replacement is clicked:
   - Update `rideSlot.driverId` to the new parent.
   - Recalculate `driveCount` and the **Fairness Score** immediately.

## 5. Seed Data (Demo Neighborhood)
Include a one-click **"טען נתוני דמו"** button that loads:
- **4 Parents:**
  1. `דנה` (4 seats) — Available Sun–Thu Morning, Sun/Tue/Thu Afternoon.
  2. `יוסי` (3 seats) — Available Sun/Mon/Wed Morning, Mon/Wed/Thu Afternoon.
  3. `מיכל` (4 seats) — Available Tue/Wed/Thu Morning, Sun/Tue/Wed Afternoon.
  4. `אבי` (3 seats) — Available Sun/Mon/Thu Morning, Sun/Mon/Tue Afternoon.
- **6 Children across 2 Schools:**
  - **בי"ס אלון (Blue tag):** Start `08:00`. End `13:30` (Sun/Tue/Thu) and `14:30` (Mon/Wed).
    - `נועה` (דנה), `איתי` (יוסי), `מאיה` (מיכל), `עומר` (אבי).
  - **גן שקד (Emerald tag):** Start `08:00`. End `14:00` (Sun–Thu).
    - `גיא` (דנה), `תמר` (מיכל).

## 6. WhatsApp Summary Format (Hebrew)
Clicking **"העתק סיכום לוואטסאפ"** copies a formatted string:
```text
🚗 *לוח הסעות שבועי — CarpoolMatch* 🚗
⚖️ מדד הוגנות קבוצתי: מאוזן (דנה: 3 | יוסי: 3 | מיכל: 3 | אבי: 2)

📅 *יום ראשון*
☀️ 08:00 | בי"ס אלון — נהג: דנה (נועה, איתי, מאיה, עומר)
🌤️ 13:30 | בי"ס אלון — נהג: אבי (נועה, איתי, מאיה)
...
```