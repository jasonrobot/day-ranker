# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run unit tests (Vitest)
npm test

# Run tests in watch mode
npm run watch
```

## Architecture

**Stack**: Angular 21.1 with NgRx Signals, TypeScript, SCSS, Vitest

**Component Hierarchy**:
- `App` (root) → `Calendar` → `Month` → `Day`

**State Management**: `CalendarStore` (NgRx signal store) holds the year state and provides:
- `updateDay(monthIdx, dayIdx, update)` - updates a day's score (-3 to +3) and comment
- `getDay(monthIdx, dayIdx)` - retrieves a day's state
- `monthStats` - computed totals and averages per month

**Data Model** (`src/app/models/app.model.ts`):
- `YearState` → 12 `MonthState` objects
- `MonthState` → array of `DayState` (one per day)
- `DayState` → `score` (-3 to +3) and `comment`

**File Conventions**:
- Components use separate `.ts`, `.html`, `.scss` files
- Component specs use `.spec.ts` suffix
- SCSS styling with component-level styles
