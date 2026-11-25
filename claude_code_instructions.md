# CLAUDE.md — CarpoolMatch (2-Day Vibe Coding Project)

## 1. Project Context
CarpoolMatch is a mobile-first, Hebrew (RTL) web app that helps neighboring parents organize and balance weekly school carpools (Sunday–Thursday, Morning & Afternoon).
The primary goal is a **working, visually impressive, bug-free MVP** ready for a live 3-minute competition demo.

## 2. Tech Stack & Architecture (STRICT)
- **Framework:** React + Vite + TypeScript.
- **Styling:** Tailwind CSS + `lucide-react` icons.
- **Language & Direction:** Hebrew UI (`dir="rtl"`, `lang="he"`), clean font (`Heebo` or `Assistant` via Google Fonts).
- **State & Storage:** React `useState` / `useContext` persisted automatically to `localStorage`.
- **NO Backend / NO Database / NO Auth:** Do NOT set up Express, Firebase, Supabase, or real login/signup screens. Use a top-bar "Viewing as: [Parent]" dropdown switcher instead.

## 3. Core Files & Reference Docs
Before writing code, always consult:
- `requirements.md` — Functional requirements and scope.
- `design.md` — UI layout and component structure.
- `scheduling-rules.md` — Exact algorithm, fairness formula, swap rules, and seed data.
- `tasks.md` — Step-by-step build order.

## 4. Strict Guardrails (DO NOT DO)
- Do NOT over-engineer (no Redux, no complex routing libraries if simple tab state suffices).
- Do NOT add Google Maps, GPS routing, or external API integrations.
- Do NOT invent new scheduling math—strictly follow `scheduling-rules.md`.
- Always keep the app runnable (`npm run dev`) after every single step.

## 5. Development Workflow
Work strictly in small, verifiable steps:
1. **Step 1 (Data & Logic):** Create `types.ts`, `seedData.ts`, and `scheduler.ts` (pure functions for auto-scheduling, fairness calculation, and SOS swap).
2. **Step 2 (Main Dashboard):** Build the RTL layout, top bar (User Switcher + Auto-Schedule + Load Demo), Fairness Meter, and 5-day Schedule Grid.
3. **Step 3 (Interactivity):** Add the SOS Swap modal, Families & Availability setup tab, and WhatsApp summary export.
4. **Step 4 (Polish):** Ensure mobile responsiveness, clear conflict states (red highlight when no driver is available), and smooth UX.