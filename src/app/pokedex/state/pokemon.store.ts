import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, of, tap } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs';
import { Pokemon, PokemonAbility, PokemonRaw, mapRawToPokemon } from '../models/pokemon.model';
import { PokemonApiService } from '../../core/services/pokemon-api.service';
import { DEFAULT_FETCH_LIMIT } from '../../common/constants/app.constants';

export interface PokemonState {
  pokemon: Pokemon[];
  abilities: Record<number, PokemonAbility[]>;
  loading: boolean;
  abilitiesLoading: boolean;
  error: string | null;
  abilitiesError: string | null;
  loaded: boolean;
}

const initialState: PokemonState = {
  pokemon: [],
  abilities: {},
  loading: false,
  abilitiesLoading: false,
  error: null,
  abilitiesError: null,
  loaded: false,
};

@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly state$ = new BehaviorSubject<PokemonState>(initialState);
  private readonly api = inject(PokemonApiService);

  /** Observable of the entire state — avoid using directly; prefer selectors */
  readonly state: Observable<PokemonState> = this.state$.asObservable();

  /** Whether Pokémon data is currently loading */
  readonly loading$ = this.select((s) => s.loading);

  /** Whether Pokémon data has been loaded at least once */
  readonly loaded$ = this.select((s) => s.loaded);

  /** Current error message, or null */
  readonly error$ = this.select((s) => s.error);

  /** All cached Pokémon */
  readonly pokemon$ = this.select((s) => s.pokemon);

  /** Whether abilities are currently loading */
  readonly abilitiesLoading$ = this.select((s) => s.abilitiesLoading);

  /** Current abilities error, or null */
  readonly abilitiesError$ = this.select((s) => s.abilitiesError);

  /**
   * Load all Pokémon from the API (first generation batch).
   * Caches results so subsequent calls are no-ops unless force is true.
   */
  loadPokemon(force = false): void {
    const current = this.state$.getValue();
    if (current.loaded && !force) return;
    if (current.loading) return;

    this.patchState({ loading: true, error: null });

    this.api.fetchPokemonList$(DEFAULT_FETCH_LIMIT, 0).pipe(
      tap((rawList: PokemonRaw[]) => {
        const pokemon = rawList.map(mapRawToPokemon);
        this.patchState({ pokemon, loading: false, loaded: true, error: null });
      }),
      catchError((err: Error) => {
        this.patchState({ loading: false, error: err.message });
        return of(null);
      }),
    ).subscribe();
  }

  /**
   * Load abilities for a specific Pokémon.
   * Caches results so repeated calls for the same ID are no-ops.
   */
  loadAbilities(pokemonId: number): void {
    const current = this.state$.getValue();
    if (current.abilities[pokemonId]) return;

    this.patchState({ abilitiesLoading: true, abilitiesError: null });

    this.api.fetchPokemonAbilities$(pokemonId).pipe(
      tap((abilities) => {
        const currentAbilities = this.state$.getValue().abilities;
        this.patchState({
          abilities: { ...currentAbilities, [pokemonId]: abilities },
          abilitiesLoading: false,
          abilitiesError: null,
        });
      }),
      catchError((err: Error) => {
        this.patchState({ abilitiesLoading: false, abilitiesError: err.message });
        return of(null);
      }),
    ).subscribe();
  }

  /**
   * Get cached abilities for a Pokémon by ID.
   * Returns an observable that emits whenever the abilities map changes.
   */
  selectAbilities$(pokemonId: number): Observable<PokemonAbility[] | undefined> {
    return this.select((s) => s.abilities[pokemonId]);
  }

  /**
   * Find a single Pokémon by ID from the cache.
   */
  selectPokemonById$(id: number): Observable<Pokemon | undefined> {
    return this.select((s) => s.pokemon.find((p) => p.id === id));
  }

  /** Retry loading after an error */
  retry(): void {
    this.loadPokemon(true);
  }

  /** Retry loading abilities for a specific Pokémon */
  retryAbilities(pokemonId: number): void {
    const current = this.state$.getValue();
    const { [pokemonId]: _, ...rest } = current.abilities;
    this.patchState({ abilities: rest });
    this.loadAbilities(pokemonId);
  }

  /**
   * Create a derived observable that emits only when the selected slice changes.
   * Uses distinctUntilChanged with JSON comparison for objects.
   */
  private select<T>(selector: (state: PokemonState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay(1),
    );
  }

  private patchState(partial: Partial<PokemonState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}
