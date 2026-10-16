# Fairway — modular React + JavaScript + Tailwind starter

A mobile-first 4-player Stableford scorekeeper. **No TypeScript**, no Firebase yet. Scores persist in localStorage on the current browser.

## Run

```sh
npm install
npm run dev
```

Check scoring: `npm test`. Check production build: `npm run build`.

## Code quality (ESLint + Prettier)

```sh
npm run lint          # find bugs / questionable JavaScript patterns
npm run lint:fix      # automatically fix eligible lint issues
npm run format        # format all project files with Prettier
npm run format:check  # verify formatting without changing files
npm run check         # lint, formatting, tests, production build
```

ESLint rules are configured in `eslint.config.js`, with React Hooks checks and browser globals.
Prettier style preferences are in `.prettierrc.json`. The GitHub Pages workflow checks linting
and formatting before tests and build. In VS Code, install the ESLint and Prettier extensions
and enable **Format on Save** with Prettier as the default formatter.

## Where to make changes

- `src/components/ui/`: shared visual controls (`Button`, `Card`, `Field`, `PageHeading`).
- `src/components/layout/AppShell.jsx`: shared header, navigation, footer and page layout.
- `src/components/Dashboard.jsx`: home overview and shortcuts.
- `src/components/Scorecard.jsx`: score-entry screen and hole selection.
- `src/components/ScoreStepper.jsx`: reusable stroke counter.
- `src/components/Leaderboard.jsx`: live provisional rankings.
- `src/components/Setup.jsx`: tournament, course and player editing.
- `src/lib/handicap.js`: WHS calculations, independent of React.
- `src/lib/stableford.js`: Stableford calculations, independent of React.
- `src/hooks/useTournament.js`: state updates and local persistence.
- `src/data/sample.js`: fictional sample scorecard and players.
- `src/styles/tailwind.css`: Tailwind v4 entry point and centralised colour tokens.
- `src/App.jsx`: simple screen switcher; no routing library yet.

Prior legacy CSS is no longer imported. Source files remain in `src/styles/` for reference but can be removed.

## Deployment to baggyham.com/golf/

Create a GitHub repository named `golf` on the same user account as `baggyham.github.io`; push this project's contents to its `main` branch. In repository Settings → Pages choose **GitHub Actions**. The existing `.github/workflows/deploy.yml` deploys the built `dist/` folder. `vite.config.js` sets `base: '/golf/'`.

## Scope and limitations

- This release manages a single tournament in one browser, not shared multiplayer sessions.
- Replace sample values with the actual tees, slope, course rating, pars and stroke indices before a real competition.
- Enter the official Handicap Index manually; this application does not connect to England Golf or report qualifying scores.
- Playing Handicap and Stableford scoring have isolated automated tests; always run them after editing scoring rules.
- Course changes recalculate prior scores. Tournament snapshots, course library, multiplayer and countback are planned follow-on work.

## Tournament management (v0.3)

- **Tournaments**: create a Stableford competition, choose a saved course, 1–4 players and a handicap allowance; open, finish, reopen or delete previous rounds. A round can be finished when all selected players have an entry on all 18 holes. Use **Pick up (0 pts)** for an uncompleted hole.
- **Players**: maintain a reusable player library. Update Handicap Indices before creating a new round.
- **Courses**: maintain a reusable course/tee library with 18 pars, unique stroke indices, Course Rating and Slope Rating.
- **Round setup**: edit the currently selected competition only. Completed rounds are locked until reopened.
- The original single-round browser storage is automatically migrated on the first load. Make a backup of your old browser data before clearing site storage.

**Data is still saved only in one browser's localStorage.** GitHub Pages does not synchronise data or accounts. A course or player update does **not** retroactively affect a previously created competition. The supplied course and player names are fake sample records; verify all WHS data before using it for real tournaments.

### Code map

- `src/lib/tournaments.js` — domain rules, course validation, tournament creation, score updates and completion checks.
- `src/lib/storage.js` — versioned persistence and migration from the original single-tournament format.
- `src/hooks/useTournament.js` — React state/actions for courses, players, and tournament lifecycle.
- `src/components/Tournaments.jsx`, `Courses.jsx`, `Players.jsx` — independent management screens.
