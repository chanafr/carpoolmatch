# CarpoolMatch — Product Requirements Document (PRD)

## 1. Overview & Problem Statement
* **Project Name:** CarpoolMatch
* **Goal:** A lightweight, mobile-first web application that automates and balances school carpool schedules among neighboring parents.
* **The Problem:** Coordinating daily school drop-offs and pick-ups via group chats creates confusion, missed rides, and perceived unfairness when some parents drive disproportionately more than others or struggle with mismatched school dismissal times.
* **The Solution:** A single-click smart scheduling engine that matches drivers, vehicle capacities, and children's specific daily start/end times while maintaining a transparent **Fairness Score** across all participating families.

## 2. Target Audience & Scope Constraints
* **Target Users:** Neighboring parents sharing school/kindergarten transportation duties.
* **Sprint Constraint:** Must be built, tested, and demo-ready within a **2-day Vibe Coding workshop**.
* **Scope Guardrails (What we are NOT building):**
  * No real authentication/signup flows (use a quick "View as Parent" switcher for instant multi-user demoing).
  * No live GPS routing or Google Maps distance matrix APIs.
  * No multi-group or external calendar syncing.

## 3. Core Functional Requirements (MVP)

### FR-1: Quick Demo & User Switcher
* **Seed Data Loader:** A one-click **"Load Neighborhood Demo"** button that populates 4 families, 6 children, 2 schools, and realistic weekly availability.
* **Active User Switcher:** A top-bar dropdown allowing instant switching between parents (e.g., *Dana, Yossi, Michal, Avi*) to simulate multi-parent interaction during the live presentation.

### FR-2: Parent & Child Onboarding (Setup)
* **Parent Profile:** Name, available passenger seats (excluding driver), and a weekly availability matrix (Sunday–Thursday, Morning Drop-off / Afternoon Pick-up).
* **Child Profile(s):** Child's name, assigned parent, School/Institution name (color-coded tag), and daily start/end times (Sunday–Thursday).

### FR-3: Smart Schedule Generator (Auto-Matcher)
* **Grouping Logic:** Groups children by `(Day + Direction [Morning/Afternoon] + School + Time Window)`.
* **Driver Assignment Logic:**
  1. Filters parents marked as "Available" for that specific day/direction.
  2. Ensures the parent's vehicle has enough passenger seats for the grouped children.
  3. **Fairness Balancing:** Prioritizes the eligible parent with the *lowest current drive count* (and ideally whose own child is in that specific ride).
* **Conflict Flagging:** Clearly highlights any ride slot where no driver is available or vehicle capacity is exceeded.

### FR-4: Weekly Dashboard & Live Fairness Meter
* **Schedule Board:** Clean day-by-day view (Sun–Thu) split into Morning and Afternoon cards showing: Time, School Tag, Assigned Driver, and Passenger List.
* **Fairness Score Bar:** A visual progress/balance indicator at the top of the dashboard showing total drives per parent vs. group average, updating dynamically whenever changes occur.

### FR-5: One-Click Emergency Swap ("Can't Drive / SOS")
* Clicking **"Can't Drive"** on any assigned shift immediately finds eligible backup parents for that slot.
* Displays recommended replacements ranked by lowest drive count.
* Selecting a replacement updates the schedule and recalculates the Fairness Score in real time.

### FR-6: One-Click WhatsApp Summary Export
* Generates a clean, emoji-formatted Hebrew/English text summary of the weekly schedule (or daily schedule) and copies it to the clipboard with a toast confirmation.

## 4. Non-Functional Requirements & Success Criteria
* **Persistence:** All data persists in browser `localStorage` so refreshes do not wipe changes, with a "Reset Demo" option.
* **Responsiveness:** Mobile-first card layout that scales cleanly onto a desktop widescreen for the final pitch.
* **Success Criteria:** During the 3-minute final demo, we can load demo data, add a new child/parent, generate a balanced weekly schedule in 1 click, resolve a sudden driver cancellation via SOS swap, and copy the WhatsApp summary.