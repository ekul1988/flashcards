# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
```

No test or lint commands are configured.

## Architecture

This is a Next.js 16 flashcard study app using the App Router with React 19 and TypeScript.

### Authentication Flow

Password-protected site using middleware-based auth:
- `middleware.ts` checks for `flashcards-auth` cookie on all routes except `/login` and `/api/login`
- `/api/login/route.ts` validates password against `SITE_PASSWORD` env var and sets HTTP-only cookie (30-day expiry)
- Password stored in `.env.local`

### Data Layer

Static JSON files in `/data/` directory (no database):
- `flashcards_core.json` - Main flashcard deck (753 cards)
- `flashcards_acronyms.json` - Acronym definitions
- `Real_Estate_Tests_Merged.json` - Practice test questions (8 categories, 306 questions)
- Flashcard schema: `{id, question, answer}`
- Test question schema: `{id, question, options: [{key, text}], correctOptionKey}`

### Client State

All state management is client-side in `app/page.tsx`:
- React useState for session state (current card, deck selection, mode)
- localStorage key `flashcards-wrong` persists wrong answer tracking across sessions
- Fisher-Yates shuffle for card randomization

### UI Modes

The main page (`app/page.tsx`) has two app modes accessible from a mode selector:

**Flash Cards Mode:**
1. Setup - Deck selection, wrong-only toggle, card count slider
2. Active session - Card flip interaction with progress display
3. Complete - Statistics and restart options

**Practice Test Mode:**
1. Setup - Category selection (multi-select), question count slider
2. Active test - Multiple choice questions with A/B/C/D options
3. Complete - Overall score and category breakdown (color-coded: green=strong 80%+, yellow=medium 60-79%, red=weak <60%)