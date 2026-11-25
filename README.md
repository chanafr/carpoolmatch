# CarpoolMatch

Mobile-first Hebrew (RTL) app that builds a fair weekly school-carpool schedule for neighboring parents.
No backend: all data lives in the browser (`localStorage`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # scheduler, fairness, swap, actions, WhatsApp + full demo flow
npm run verify     # prints the demo week's schedule in the terminal
npm run build      # production build into dist/
```

To open it on a phone on the same Wi‑Fi: `npm run dev -- --host` and browse to the printed network address.

## 3-minute demo script

Start with a clean slate: click **טען דמו / טען נתוני דמו** (top bar).

1. **The problem → one click.** Click **✨ שיבוץ אוטומטי לשבוע**. 20 rides, 4 parents × 5 drives, fairness **100% · מאוזן מאוד**.
   Point at a card's reason line ("איזון עומס … + הילד/ה בנסיעה") to show *why* each driver was picked.
2. **Live input.** Tab **משפחות וזמינות** → *הוספת ילד/ה*: name `רוני`, parent `יוסי לוי`, school `בי״ס יסודי אלון`,
   end time `16:00` → **הוספה**. Amber banner appears → **חשב לוח מחדש**. New 16:00 pickups appear; fairness 93%.
3. **Someone gets stuck.** Switch **צופה בתור** to *יוסי* and pick the **הנסיעות שלי** filter.
   On **Sunday 14:00 (גן שקד)** click **לא יכול/ה להסיע / החלפה** → best match *דנה*, "מדד הוגנות אחרי ההחלפה: 93%"
   → **אישור החלפה**. The card flashes and the meter updates.
   *Why this ride:* Yossi has the most drives (7), so swapping any of his rides keeps 93%; swapping other parents drops to 86%.
   (`npx vite-node scripts/demo-swap-options.ts` lists every option.)
4. **Real-world ready.** Click **העתק לוואטסאפ** → toast "הסיכום הועתק!" → paste into WhatsApp.

Avoid during the demo: turning off a parent's availability *and then* adding a 4th child to the same school —
that can leave a ride with no eligible driver (correctly shown in red, but it slows the story down).

## Where things live

- `carpool-seed-data.json` — demo neighborhood (single source of truth for "Load Demo")
- `src/utils/scheduler.ts` — grouping, greedy fair assignment, fairness score, swap candidates (per `scheduling_rules_data_specification.md`)
- `src/state/` — app state + pure actions (add parent/child, availability, swap)
- `src/components/` — UI (top bar, fairness meter, schedule grid, swap sheet, families tab)

---

## Claude Design export (original notes)

This project's pages, files, and uploads as this browser tab had them at export.

- `Logo.dc.html`, `Main.dc.html` — the design artboards
- `canvas.json` — the canvas: its pages, where each artboard sits, its notes and shapes
- `_runtime/` — what runs the pages in a browser; not part of the design

To view a design page, start a local web server in this folder (for example `python3 -m http.server`), then open an
artboard's `.dc.html` file through it. Opening the file directly may not work, because some browsers block its scripts.
The export never includes hidden files (files whose names start with a dot) or files the editor keeps for its own use.
