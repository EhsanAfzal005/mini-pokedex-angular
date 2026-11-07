# Mini Pokédex: Angular 21 + GraphQL

A responsive, high-performance Mini Pokédex single-page application built with **Angular 21**, **Signals**, custom **RxJS BehaviorSubject stores**, and **GraphQL** (PokéAPI + local mock server).

Developed in strict accordance with the project developer guide, featuring signal-based inputs/outputs, standalone OnPush components, complete 4-state async UI handling (Loading, Empty, Error + Retry, Success), and optimistic mutations with rollback.

## Features

- **Pokédex Table View**:
  - Live Pokémon browsing from PokéAPI GraphQL with official artwork sprites, colored type badges, and all 6 base stats.
  - Client-side pagination (10, 25, 50 rows per page).
  - Stat column sorting (HP, Attack, Defense, Sp.Atk, Sp.Def, Speed, Total Stats, and Name).
  - Debounced search typeahead (`debounceTime(300)` → `distinctUntilChanged()` → `switchMap`).
  - Dropdown filtering by Pokémon type.

- **Slide-in Detail Side Panel**:
  - Full Pokémon profile, height, weight, and base stats with progressive visual bars.
  - Interactive **ECharts Radar Chart** visualizing the Pokémon's 6 base stats with smooth animations on selection.
  - Lazy-loaded abilities query from PokéAPI with hidden ability indicators and short effect descriptions.

- **Team Builder (Reactive Forms)**:
  - Form validation with dirty/touched state tracking (no alert dialogs).
  - Team name: required, 3 to 30 characters, and an asynchronous validator that checks name uniqueness against existing teams.
  - Pokémon picker with debounced typeahead autocomplete and removable chips (1 to 6 Pokémon).
  - Real-time computed team analytics: total team base stats and type distribution badges.
  - **Optimistic Updates**: New teams appear in the list immediately; if the mutation fails, state automatically rolls back and surfaces a user-friendly error toast/banner.

- **Team Management**:
  - View all created teams with their Pokémon sprites and creation dates.
  - Team selection persisted to `localStorage` via Angular `effect()`.
  - Optimistic deletion with automatic rollback on server error.

- **Resilient UI States**:
  - Every async view implements all 4 states:
    1. **Loading**: Shimmer skeleton animations (no layout jumps or blank screens).
    2. **Empty**: Clear, informative empty messages with helpful hints.
    3. **Error**: Descriptive error messages paired with an active **Retry** action.
    4. **Success**: Polished, responsive data presentation.

## Tech Stack & Architecture

- **Framework**: Angular 21.2 (Standalone Components, `ChangeDetectionStrategy.OnPush`, `inject()`)
- **Reactivity & State**:
  - **RxJS 7.8**: Custom `BehaviorSubject` stores (`PokemonStore`, `TeamStore`) and derived observable selectors (`PokemonSelectors`) using `map`, `distinctUntilChanged`, `combineLatest`, `shareReplay(1)`, and `switchMap`.
  - **Angular Signals**: `signal()`, `computed()`, `effect()` (localStorage persistence), `toSignal()` bridging store observables to template signals, and `input()`/`output()` modern component APIs.
- **Data Visualization**: Apache ECharts 6.1 with `ngx-echarts` 22.
- **Styling**: SCSS with BEM methodology, custom properties design tokens (`:root`), and smooth transitions.
- **Testing**: Vitest with `@angular/build:unit-test`.

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/EhsanAfzal005/mini-pokedex-angular.git
cd mini-pokedex-angular
npm install
```

### Running the Local Mock GraphQL Server (Mutations)

The local mock GraphQL server manages team creation, listing, and deletion on port `4000`:

```bash
npm run mock:server
```

The mock GraphQL endpoint will be live at `http://localhost:4000`.

### Running the Angular Application

In a separate terminal, start the Angular development server:

```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:4200
```

## Running Unit Tests

Unit tests verify the core requirements, including optimistic rollback, derived selectors, and form validators:

```bash
npm test
```

### Test Coverage Highlights

- **`src/app/teams/state/team.store.spec.ts`**:
  - Optimistic team addition and ID reconciliation upon mutation success.
  - Rollback of optimistic state when API mutation throws an error.
  - Rollback of optimistic team deletion on network/server failure.

- **`src/app/pokedex/state/pokemon.selectors.spec.ts`**:
  - Extracting sorted unique Pokémon types.
  - Debounced search query filtering.
  - Type-based filtering and stat-based ascending/descending sorting.
  - Pagination slicing and `isEmpty$` emission.

- **`src/app/teams/team-builder/team-builder.component.spec.ts`**:
  - Synchronous form validation (required, minlength 3, maxlength 30).
  - Asynchronous duplicate team name validation (case-insensitive).
  - Validation of minimum (1) and maximum (6) Pokémon selections.
  - Computed total team base stats calculation.

- **`src/app/app.spec.ts`**:
  - Root app component creation and brand header verification.

## Project Structure

```
src/app/
├── common/
│   └── constants/
│       └── app.constants.ts       # Type colors, pagination options, sizing limits
├── core/
│   ├── graphql/
│   │   ├── pokemon-api.graphql.ts # PokéAPI GraphQL queries (list, abilities)
│   │   └── team-api.graphql.ts    # Mock GraphQL queries & mutations (teams, trainers)
│   └── services/
│       ├── pokemon-api.service.ts # PokéAPI service with retry backoff logic
│       └── team-api.service.ts    # Team & Trainer GraphQL service
├── pokedex/
│   ├── models/
│   │   └── pokemon.model.ts       # Pokémon types, stats, abilities, and API mapper
│   ├── pokedex-page/
│   │   ├── pokedex-page.component.ts
│   │   ├── pokedex-page.component.html
│   │   └── pokedex-page.component.scss
│   ├── pokedex-table/
│   │   ├── pokedex-table.component.ts
│   │   ├── pokedex-table.component.html
│   │   └── pokedex-table.component.scss
│   ├── pokemon-detail/
│   │   ├── pokemon-detail.component.ts
│   │   ├── pokemon-detail.component.html
│   │   └── pokemon-detail.component.scss
│   └── state/
│       ├── pokemon.store.ts       # BehaviorSubject store with caching
│       ├── pokemon.store.spec.ts
│       ├── pokemon.selectors.ts   # Debounced, filtered, sorted, and paged streams
│       └── pokemon.selectors.spec.ts
├── teams/
│   ├── models/
│   │   └── team.model.ts          # Team, Trainer, and CreateTeamInput interfaces
│   ├── state/
│   │   ├── team.store.ts          # Optimistic team updates & rollback store
│   │   └── team.store.spec.ts
│   ├── team-builder/
│   │   ├── team-builder.component.ts
│   │   ├── team-builder.component.html
│   │   ├── team-builder.component.scss
│   │   └── team-builder.component.spec.ts
│   ├── team-list/
│   │   ├── team-list.component.ts
│   │   ├── team-list.component.html
│   │   └── team-list.component.scss
│   └── teams-page/
│       ├── teams-page.component.ts
│       ├── teams-page.component.html
│       └── teams-page.component.scss
├── app.config.ts                  # App providers (HttpClient, ECharts, Router)
├── app.routes.ts                  # Lazy-loaded feature routes
├── app.ts                         # Root application shell
├── app.html
├── app.scss
└── styles.scss                    # Global CSS custom properties design tokens
```

## What Would Be Improved With More Time

1. **Virtual Scrolling with `@angular/cdk/scrolling`**:
   Replace client-side pagination with a high-performance virtual scrolling viewport capable of smoothly scrolling thousands of Pokémon with skeleton rows.
2. **Drag-and-Drop Team Assembly (`@angular/cdk/drag-drop`)**:
   Allow dragging Pokémon directly from the table or autocomplete list into visual team slots.
3. **Type Effectiveness & Synergy Matrix**:
   Calculate defensive weaknesses, resistances, and offensive coverage across the team's combined types to guide team-building strategy.
4. **Offline Persistence & Background Sync**:
   Store cached Pokémon and pending team mutations in IndexedDB via Service Workers, replaying mutations when network connectivity resumes.
5. **Dark / Light Theme Toggle**:
   Support theme switching via CSS variables and system preference detection.

## License

MIT
