# WishList — Polished, Fast, Focused Todo

A rich-featured, high-response Todo / Wishlist app built with Next.js. List, Kanban Board, and Calendar views. Offline-first, instant interactions, dark mode, and recruiter-ready polish.

Live: `https://projectgrow-ten.vercel.app`
Repo: `https://github.com/SomnathShaw001/WishList`

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4) ![Framer Motion](https://img.shields.io/badge/Framer_Motion-13-ff0080) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Features

**3 Views**
- List — inline edit, priority pills, due badges, tags, subtask progress
- Board — drag & drop Kanban (`todo / inprogress / done`), drop targets, counts
- Calendar — 14-day strip, due-date grouping, today highlight

**Task Model**
- Title, description, status, priority (`low / medium / high / urgent`), due date, tags, subtasks, list / space, `createdAt`, `completedAt`
- Status cycle: `todo → inprogress → done`, quick checkbox toggle
- Subtasks with checkbox, add / delete, completion count

**Spaces**
- All Tasks, Today (auto by due date), WishList, Work, Personal, Ideas
- Per-space live counts, gradient Today Focus card

**Speed / UX**
- Offline-first `localStorage` (`wishlist.v2`), optimistic updates, no server round-trip
- `framer-motion` LayoutGroup + AnimatePresence, 60fps transitions
- Search (`/` to focus), Command palette (`⌘K / Ctrl+K`: clear done, reset demo, export)
- Filters: priority, status, show / hide completed, text search, smart sort (urgent → due date)
- Detail drawer (slide-in): edit all fields, subtasks, Focus 25m Pomodoro, duplicate / delete
- Pomodoro mini-player (25m timer, pause / resume), toast system
- Export / Import JSON, Reset to demo data
- Dark / light toggle (persisted), fully responsive, keyboard-first

## Tech Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS 4, Framer Motion 13
- LocalStorage persistence, no backend required
- Fonts: Fraunces (display) + Instrument Sans + JetBrains Mono via Google Fonts

## Getting Started

```bash
git clone https://github.com/SomnathShaw001/WishList.git
cd WishList
npm install
npm run dev
# open http://localhost:3000
```

```bash
npm run build
npm run start
```

## Project Structure

```
src/app/
  page.tsx      # WishList app — state, views, drawer, palette, pomodoro
  layout.tsx    # Metadata + fonts
  globals.css   # Tailwind + theme tokens
public/         # Static assets
```

State lives in `page.tsx`: `tasks`, `activeList`, `view`, `search`, `priorityFilter`, `statusFilter`, `selectedTask`, `pomodoro`. Persisted to `localStorage`.

## Deploy on Vercel

1-click (recommended):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SomnathShaw001/WishList)

Manual:
1. Push to GitHub (already done: `main`)
2. Go to `vercel.com → Add New → Project → Import SomnathShaw001/WishList`
3. Framework: Next.js, Build: `npm run build`, Output: `.next`
4. Deploy — no env vars required

```bash
npx vercel --prod
```

## Roadmap

- [ ] Auth + Postgres (Prisma + Neon) + Vercel Postgres
- [ ] Real DnD (`dnd-kit`) with column reorder + persistence
- [ ] Reminders / notifications, recurring tasks
- [ ] Shareable public wishlist link
- [ ] AWS alternative deploy (Amplify / EC2 + RDS)

## Author

Somnath Shaw  
GitHub: [@SomnathShaw001](https://github.com/SomnathShaw001)
