import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, map, distinctUntilChanged, shareReplay, of } from 'rxjs';
import { Team, CreateTeamInput } from '../models/team.model';
import { TeamApiService } from '../../core/services/team-api.service';

export interface TeamState {
  teams: Team[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  mutationError: string | null;
}

const initialState: TeamState = {
  teams: [],
  loading: false,
  error: null,
  loaded: false,
  mutationError: null,
};

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly state$ = new BehaviorSubject<TeamState>(initialState);
  private readonly api = inject(TeamApiService);

  /** All teams */
  readonly teams$ = this.select((s) => s.teams);

  /** Whether teams are loading */
  readonly loading$ = this.select((s) => s.loading);

  /** Current error message */
  readonly error$ = this.select((s) => s.error);

  /** Whether teams have been loaded */
  readonly loaded$ = this.select((s) => s.loaded);

  /** Error from a mutation (create/delete) */
  readonly mutationError$ = this.select((s) => s.mutationError);

  /**
   * Load teams from the mock server.
   * Caches results — no-op if already loaded unless force is true.
   */
  loadTeams(force = false): void {
    const current = this.state$.getValue();
    if (current.loaded && !force) return;
    if (current.loading) return;

    this.patchState({ loading: true, error: null });

    this.api.fetchTeams$().pipe(
      tap((teams) => {
        this.patchState({ teams, loading: false, loaded: true, error: null });
      }),
      catchError((err: Error) => {
        this.patchState({ loading: false, error: err.message });
        return of(null);
      }),
    ).subscribe();
  }

  /**
   * Create a team with optimistic update.
   * The team is immediately added to the list. If the mutation fails,
   * it is rolled back and a mutationError is set.
   * @returns Observable that completes when the mutation resolves.
   */
  createTeam$(input: CreateTeamInput): Observable<Team | null> {
    this.patchState({ mutationError: null });

    // Optimistic: add a temporary team immediately
    const tempId = -(Date.now());
    const optimisticTeam: Team = {
      id: tempId,
      trainer_id: input.trainer_id,
      name: input.name,
      pokemon_ids: input.pokemon_ids,
      created_at: new Date().toISOString(),
    };

    const previousTeams = this.state$.getValue().teams;
    this.patchState({ teams: [...previousTeams, optimisticTeam] });

    return this.api.createTeam$(input).pipe(
      tap((created) => {
        // Replace the optimistic team with the real one from server
        const current = this.state$.getValue().teams;
        this.patchState({
          teams: current.map((t) => (t.id === tempId ? created : t)),
          mutationError: null,
        });
      }),
      catchError((err: Error) => {
        // Rollback: remove the optimistic team
        this.patchState({
          teams: previousTeams,
          mutationError: err.message,
        });
        return of(null);
      }),
    );
  }

  /**
   * Delete a team with optimistic update.
   * The team is immediately removed. If the mutation fails,
   * it is rolled back and a mutationError is set.
   * @returns Observable that completes when the mutation resolves.
   */
  deleteTeam$(id: number): Observable<void | null> {
    this.patchState({ mutationError: null });

    const previousTeams = this.state$.getValue().teams;
    // Optimistic: remove immediately
    this.patchState({ teams: previousTeams.filter((t) => t.id !== id) });

    return this.api.deleteTeam$(id).pipe(
      tap(() => {
        this.patchState({ mutationError: null });
      }),
      catchError((err: Error) => {
        // Rollback
        this.patchState({
          teams: previousTeams,
          mutationError: err.message,
        });
        return of(null);
      }),
    );
  }

  /** Check if a team name already exists (for async validator) */
  isTeamNameTaken$(name: string): Observable<boolean> {
    return this.teams$.pipe(
      map((teams) => teams.some((t) => t.name.toLowerCase() === name.toLowerCase())),
    );
  }

  /** Clear mutation error */
  clearMutationError(): void {
    this.patchState({ mutationError: null });
  }

  /** Retry loading teams */
  retry(): void {
    this.loadTeams(true);
  }

  private select<T>(selector: (state: TeamState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay(1),
    );
  }

  private patchState(partial: Partial<TeamState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}
