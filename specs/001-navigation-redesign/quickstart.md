# Quickstart: Navigation & Interaction Redesign

**How to verify this feature works end-to-end after implementation**

---

## Prerequisites

- Backend running: `cd backend && python manage.py runserver`
- Frontend running: `cd frontend && npm run dev`
- At least one goal and one finance entry in the database

---

## Verification Checklist

### 1. Hub Navigation (User Story 1)

- [ ] Open the app — sidebar shows exactly 7 items: Now, Goals, Build, Life, Learn, Intelligence, Profile
- [ ] Click each hub — the active hub is visually highlighted, content area changes
- [ ] Navigate to `/health` directly via URL — the Life hub is highlighted in the sidebar
- [ ] Navigate to `/routine` (legacy) — redirects to `/schedule`, Now hub is highlighted
- [ ] No hub has sub-links visible in the sidebar — sub-pages are tabs inside the hub

### 2. Context-Aware Home (User Story 2)

- [ ] Open the app between 05:00–11:59 — Next Action card and Priorities section are expanded by default
- [ ] Open the app between 18:00–23:59 — Last Wins and Journal sections are expanded by default
- [ ] North star section shows the user's configured goal name and target — not hardcoded "Kyrgyzstan" or "€1,000/mo"
- [ ] If no north star is configured — home surface shows a "Set your north star" prompt instead

### 3. Capture (User Story 3)

- [ ] Press `Ctrl+Shift+I` from any page — capture modal opens without leaving the page
- [ ] Click the 💡 FAB — same result
- [ ] Submit the capture with an empty title — succeeds (no error), capture is stored
- [ ] Type "review my business proposal" — suggested domain shows as "Build"
- [ ] Type "go for a run tomorrow" — suggested domain shows as "Life"
- [ ] Type "xyzabcdef" (no keywords) — suggested domain shows as "Uncategorized"
- [ ] Override suggested domain — override is stored
- [ ] Submit from Goals page — modal closes, user is back on Goals page (not redirected)

### 4. File Size (Constitution Principle IX)

- [ ] `frontend/src/pages/HomePage.tsx` is under 300 lines
- [ ] `frontend/src/components/AppShell.tsx` is under 300 lines
- [ ] Each HomeXxxSection component is under 300 lines

---

## Known Out of Scope

- Voice input for capture
- Mobile layout changes
- Arabic UI
