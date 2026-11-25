# CarpoolMatch — 2-Day Vibe Coding Execution Plan

## Day 1: Core Engine, Data Models & Basic UI (Hours 1–6)

### Task 1.1: Project Setup & Demo Seed Data
* [ ] Initialize React + Tailwind + Lucide icons project.
* [ ] Create data structures for `Parent`, `Child`, and `RideSlot`.
* [ ] Build realistic Hebrew/English **Seed Data** (4 parents, 6 kids across 2 schools with varying afternoon dismissal times like 13:30 vs. 16:00).
* [ ] Implement `localStorage` persistence with a "Reset / Load Demo" button.

### Task 1.2: Smart Matching & Fairness Algorithm
* [ ] Implement the grouping function (grouping children by Day, Direction, School, and Time).
* [ ] Implement the greedy fairness assignment logic (matching availability + seat capacity + lowest drive count + own-child tie-breaker).
* [ ] Generate human-readable `assignmentReason` strings for transparency.
* [ ] Verify edge cases: What happens when no parent is available? (Ensure `driverId: null` creates a visible Conflict card).

### Task 1.3: Main Dashboard & Schedule Grid
* [ ] Build the 5-day (Sun–Thu) responsive column layout split by Morning and Afternoon.
* [ ] Create the **Ride Card** component with color-coded school badges, driver avatar, and passenger pills.
* [ ] Build the top **Fairness Meter** widget displaying drive counts per parent and overall balance percentage.

---

## Day 2: Interactivity, "Wow" Features & Pitch Polish (Hours 7–12)

### Task 2.1: Family & Availability Management Screen
* [ ] Build the "Families & Availability" tab displaying all parents and their kids.
* [ ] Add an interactive toggle grid so users can flip Morning/Afternoon availability for any parent and re-run the scheduler live.
* [ ] Build a clean "Add Child / Add Parent" modal or form (crucial for demonstrating live input during the pitch).

### Task 2.2: Emergency SOS Swap Flow
* [ ] Add the `[Can't Drive / Swap]` button to every Ride Card.
* [ ] Build the Swap Modal that filters eligible backup parents, displays their current drive count, and lets the user reassign the ride in one click.
* [ ] Ensure the Fairness Meter animates/updates immediately upon swapping.

### Task 2.3: Pitch-Winning Features & UI Polish
* [ ] Add the top-bar **"Viewing as: [Parent]"** switcher and a `"Highlight My Drives"` toggle.
* [ ] Build the **"Copy WhatsApp Summary"** button that formats the entire weekly schedule cleanly with emojis and triggers a `"Copied to clipboard!"` toast.
* [ ] Polish visual hierarchy: RTL/Hebrew alignment check, consistent color palette, subtle hover states, and empty/conflict state styling.

### Task 2.4: Demo Rehearsal (Final 30 Mins)
* [ ] Run through the exact 3-minute live demo script:
  1. Show the messy problem -> Click **Load Demo Data**.
  2. Click **Auto-Schedule Week** -> Highlight the **96% Fairness Score**.
  3. Add a new child with a different dismissal time -> Re-schedule seamlessly.
  4. Simulate a parent getting stuck -> Use **SOS Swap** -> Show Fairness Meter updating.
  5. Click **Copy WhatsApp Summary** -> Show real-world readiness.