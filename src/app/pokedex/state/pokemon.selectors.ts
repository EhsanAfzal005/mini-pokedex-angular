import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, debounceTime, switchMap } from 'rxjs';
import { PokemonStore } from './pokemon.store';
import { Pokemon } from '../models/pokemon.model';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../common/constants/app.constants';

export type SortField = 'name' | 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'totalStats';
export type SortDirection = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class PokemonSelectors {
  private readonly store = inject(PokemonStore);

  /** Search query stream with debounce */
  private readonly searchQuery$ = new BehaviorSubject<string>('');

  /** Selected type filter */
  private readonly typeFilter$ = new BehaviorSubject<string>('');

  /** Current sort field */
  private readonly sortField$ = new BehaviorSubject<SortField>('name');

  /** Current sort direction */
  private readonly sortDirection$ = new BehaviorSubject<SortDirection>('asc');

  /** Current page index (0-based) */
  private readonly pageIndex$ = new BehaviorSubject<number>(0);

  /** Current page size */
  private readonly pageSize$ = new BehaviorSubject<number>(DEFAULT_PAGE_SIZE);

  /** Debounced search query for filtering (debounceTime(300) -> distinctUntilChanged() -> switchMap) */
  readonly debouncedSearch$: Observable<string> = this.searchQuery$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => of(query)),
    shareReplay(1),
  );

  /** All unique Pokémon types for the filter dropdown */
  readonly availableTypes$: Observable<string[]> = this.store.pokemon$.pipe(
    map((pokemon) => {
      const types = new Set<string>();
      pokemon.forEach((p) => p.types.forEach((t) => types.add(t)));
      return Array.from(types).sort();
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1),
  );

  /** Pokémon filtered by search and type */
  readonly filteredPokemon$: Observable<Pokemon[]> = combineLatest([
    this.store.pokemon$,
    this.debouncedSearch$,
    this.typeFilter$,
  ]).pipe(
    map(([pokemon, search, typeFilter]) => {
      let filtered = pokemon;

      if (search.trim()) {
        const query = search.toLowerCase().trim();
        filtered = filtered.filter((p) =>
          p.name.toLowerCase().includes(query),
        );
      }

      if (typeFilter) {
        filtered = filtered.filter((p) =>
          p.types.includes(typeFilter),
        );
      }

      return filtered;
    }),
    shareReplay(1),
  );

  /** Filtered + sorted Pokémon */
  readonly sortedPokemon$: Observable<Pokemon[]> = combineLatest([
    this.filteredPokemon$,
    this.sortField$,
    this.sortDirection$,
  ]).pipe(
    map(([pokemon, field, direction]) => {
      const sorted = [...pokemon].sort((a, b) => {
        let comparison = 0;

        if (field === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (field === 'totalStats') {
          comparison = a.totalStats - b.totalStats;
        } else {
          const aStat = a.stats.find((s) => s.name === field)?.baseStat ?? 0;
          const bStat = b.stats.find((s) => s.name === field)?.baseStat ?? 0;
          comparison = aStat - bStat;
        }

        return direction === 'asc' ? comparison : -comparison;
      });

      return sorted;
    }),
    shareReplay(1),
  );

  /** Total count of filtered results */
  readonly totalCount$: Observable<number> = this.filteredPokemon$.pipe(
    map((pokemon) => pokemon.length),
    distinctUntilChanged(),
    shareReplay(1),
  );

  /** Current page of Pokémon */
  readonly pagedPokemon$: Observable<Pokemon[]> = combineLatest([
    this.sortedPokemon$,
    this.pageIndex$,
    this.pageSize$,
  ]).pipe(
    map(([pokemon, pageIndex, pageSize]) => {
      const start = pageIndex * pageSize;
      return pokemon.slice(start, start + pageSize);
    }),
    shareReplay(1),
  );

  /** Total number of pages */
  readonly totalPages$: Observable<number> = combineLatest([
    this.totalCount$,
    this.pageSize$,
  ]).pipe(
    map(([total, pageSize]) => Math.ceil(total / pageSize)),
    distinctUntilChanged(),
    shareReplay(1),
  );

  /** Whether there are no results after filtering */
  readonly isEmpty$: Observable<boolean> = this.totalCount$.pipe(
    map((count) => count === 0),
    distinctUntilChanged(),
    shareReplay(1),
  );

  /** Update the search query (will be debounced) */
  setSearchQuery(query: string): void {
    this.searchQuery$.next(query);
    this.pageIndex$.next(0);
  }

  /** Set type filter */
  setTypeFilter(type: string): void {
    this.typeFilter$.next(type);
    this.pageIndex$.next(0);
  }

  /** Set sort field and direction */
  setSort(field: SortField, direction?: SortDirection): void {
    if (this.sortField$.getValue() === field && !direction) {
      // Toggle direction if same field clicked
      this.sortDirection$.next(this.sortDirection$.getValue() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField$.next(field);
      if (direction) {
        this.sortDirection$.next(direction);
      }
    }
    this.pageIndex$.next(0);
  }

  /** Get current sort field */
  getSortField$(): Observable<SortField> {
    return this.sortField$.asObservable();
  }

  /** Get current sort direction */
  getSortDirection$(): Observable<SortDirection> {
    return this.sortDirection$.asObservable();
  }

  /** Go to a specific page */
  setPage(index: number): void {
    this.pageIndex$.next(index);
  }

  /** Change page size */
  setPageSize(size: number): void {
    this.pageSize$.next(size);
    this.pageIndex$.next(0);
  }

  /** Get current page index */
  getPageIndex$(): Observable<number> {
    return this.pageIndex$.asObservable();
  }

  /** Get current page size */
  getPageSize$(): Observable<number> {
    return this.pageSize$.asObservable();
  }
}
