# CarpoolMatch — System Architecture & UX Design

## 1. Tech Stack (Optimized for 2-Day Vibe Coding)
* **Framework:** React (Vite) + TypeScript (or Single-File React JSX for rapid prototyping).
* **Styling:** Tailwind CSS + `lucide-react` icons.
* **State & Persistence:** React Context / `useState` synced automatically to `localStorage`.
* **Typography & Direction:** Clean sans-serif (`Heebo` / `Inter`), supporting RTL (Hebrew) or LTR seamlessly.

## 2. Data Models (JSON Schema)

```typescript
export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu';
export type Direction = 'Morning' | 'Afternoon';

export interface Parent {
  id: string;
  name: string;
  seatCapacity: number; // Number of kids they can take
  color: string;        // Avatar badge color
  availability: Record<DayOfWeek, {
    Morning: boolean;
    Afternoon: boolean;
  }>;
}

export interface Child {
  id: string;
  name: string;
  parentId: string;
  school: string;       // e.g., "Alon Elementary", "Shaked Kindergarten"
  schedule: Record<DayOfWeek, {
    startTime: string;  // e.g., "08:00"
    endTime: string;    // e.g., "13:30" (or "16:00" on long days)
    needsMorning: boolean;
    needsAfternoon: boolean;
  }>;
}

export interface RideSlot {
  id: string;
  day: DayOfWeek;
  direction: Direction;
  school: string;
  time: string;
  driverId: string | null; // null = Unassigned / Conflict!
  passengerIds: string[];  // Array of Child IDs
  assignmentReason?: string; // e.g., "Balanced load (2 drives) & own child attending"
}
```

## 3. Core Scheduling Algorithm (Step-by-Step)
1. **Reset Drives:** Initialize a `driveCount` map `{ [parentId]: 0 }`.
2. **Collect Needs:** Iterate through `Days (Sun-Thu)` and `Directions (Morning, Afternoon)`. Gather all children requiring a ride and group them by `(School + Time)`.
3. **Split by Capacity (if needed):** If 6 children need a ride to the same school at 08:00, split them into sub-rides based on available vehicle capacities.
4. **Score Eligible Drivers:** For each ride group:
   * Filter `Parents` where `availability[day][direction] === true` AND `seatCapacity >= group.length`.
   * Sort eligible parents by:
     1. Lowest `driveCount[parent.id]` (Primary fairness rule).
     2. Tie-breaker: Does this parent have their own child in this `group`? (Bonus priority).
5. **Assign & Update:** Pick the top-ranked parent, set `driverId`, increment `driveCount[parent.id]`, and attach a human-readable `assignmentReason` string.

## 4. UI Layout & Screen Wireframes

### Top Navigation Bar (Persistent)
* **Left:** App Logo (`CarpoolMatch` + Car icon).
* **Center:** View Tabs (`Weekly Schedule` | `Families & Availability`).
* **Right:**
  * Active Parent Switcher (`Viewing as: Dana ▾`)
  * Action Button: `✨ Auto-Schedule Week` (Primary CTA)
  * Utility Menu: `Load Demo Data` | `Copy WhatsApp Summary`

### Screen A: Weekly Schedule & Fairness Dashboard (Main View)
* **Top Widget — Fairness Balance Strip:**
  * Displays horizontal progress bars/pills for each parent showing their total weekly drives (e.g., *Dana: 3*, *Yossi: 3*, *Michal: 2*, *Avi: 3*) and a green badge: **"96% Fairness Balance"**.
* **Filter Bar:** Filter by `All Rides` | `My Drives Only` | `Conflicts Only`.
* **Main Grid (5 Columns: Sun – Thu):**
  * Each day column splits into **Morning (☀️)** and **Afternoon (🌤️)** sections.
  * **Ride Card Anatomy:**
    * Header: Time (`08:00`) + School Pill (`Alon School` in Blue / `Shaked Gan` in Emerald).
    * Body: Driver Badge (`🚗 Driver: Yossi`) + Passenger Chips (`👧 Noa`, `👦 Itay`, `👧 Maya`).
    * Footer: Subtle tooltip/text explaining *why* Yossi was chosen + `[SOS / Swap]` button.
    * *Conflict State:* If `driverId === null`, card borders glow red with `[⚠️ Assign Driver]` button.

### Screen B: Families & Availability Setup
* **Add Parent / Add Child Forms:** Simple inline cards to add a new neighbor or child with custom school dismissal times.
* **Interactive Availability Matrix:** A clean toggle grid (Parents × Sun–Thu Morning/Afternoon) so users can toggle availability on/off and immediately click `Re-calculate Schedule` to see the algorithm adapt.

### Modal: Emergency SOS Swap
* Triggered when clicking `[SOS / Swap]` on any ride card.
* Shows current ride details and lists **Available Backup Drivers** with their current drive count (e.g., *"Michal — Available, currently has 2 drives (Lowest)"*).
* One click swaps the driver, updates the Fairness Meter, and logs the change.