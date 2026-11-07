/** Default number of Pokémon to fetch per batch (Gen 1 & Gen 2) */
export const DEFAULT_FETCH_LIMIT = 251;

/** Page size options for the Pokédex table */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** Default page size */
export const DEFAULT_PAGE_SIZE = 25;

/** Debounce time for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Maximum team size */
export const MAX_TEAM_SIZE = 6;

/** Minimum team size */
export const MIN_TEAM_SIZE = 1;

/** Team name constraints */
export const TEAM_NAME_MIN_LENGTH = 3;
export const TEAM_NAME_MAX_LENGTH = 30;

/** Pokémon type colors for badges */
export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};
