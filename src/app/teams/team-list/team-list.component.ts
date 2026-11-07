import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TeamStore } from '../state/team.store';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { Team, Trainer } from '../models/team.model';
import { TYPE_COLORS } from '../../common/constants/app.constants';

const SELECTED_TEAM_STORAGE_KEY = 'pokedex_selected_team_id';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamListComponent implements OnInit {
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeColors = TYPE_COLORS;

  // Store state as signals
  readonly teams = toSignal(this.teamStore.teams$, { initialValue: [] });
  readonly loading = toSignal(this.teamStore.loading$, { initialValue: true });
  readonly error = toSignal(this.teamStore.error$, { initialValue: null });
  readonly loaded = toSignal(this.teamStore.loaded$, { initialValue: false });
  readonly mutationError = toSignal(this.teamStore.mutationError$, { initialValue: null });

  readonly allPokemon = toSignal(this.pokemonStore.pokemon$, { initialValue: [] });
  readonly trainers = toSignal(this.teamStore.trainers$, { initialValue: [] });

  // Deletion state
  readonly deletingId = signal<number | null>(null);

  // Failed trainer avatars tracking
  readonly failedAvatars = signal<Set<number>>(new Set());

  onAvatarError(trainerId: number): void {
    this.failedAvatars.update((set) => new Set(set).add(trainerId));
  }

  isAvatarFailed(trainerId: number): boolean {
    return this.failedAvatars().has(trainerId);
  }

  // Selected team state (persisted to localStorage via effect)
  readonly selectedTeamId = signal<number | null>(
    (() => {
      try {
        const saved = localStorage.getItem(SELECTED_TEAM_STORAGE_KEY);
        return saved ? Number(saved) : null;
      } catch {
        return null;
      }
    })()
  );

  /** Currently selected team derived from selectedTeamId */
  readonly selectedTeam = computed(() => {
    const id = this.selectedTeamId();
    if (id === null) return null;
    return this.teams().find((t) => t.id === id) ?? null;
  });

  /** Computed total base stats for the selected team */
  readonly selectedTeamTotalStats = computed(() => {
    const team = this.selectedTeam();
    if (!team) return 0;
    const pokemonMap = new Map(this.allPokemon().map((p) => [p.id, p]));
    return team.pokemon_ids.reduce((sum, id) => {
      const p = pokemonMap.get(id);
      return sum + (p?.totalStats ?? 0);
    }, 0);
  });

  /** Computed type distribution for the selected team */
  readonly selectedTeamTypeDistribution = computed(() => {
    const team = this.selectedTeam();
    if (!team) return [];
    const pokemonMap = new Map(this.allPokemon().map((p) => [p.id, p]));
    const counts: Record<string, number> = {};

    team.pokemon_ids.forEach((id) => {
      const p = pokemonMap.get(id);
      p?.types.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  });

  // UI states
  readonly showLoading = computed(() => this.loading() && !this.loaded());
  readonly showError = computed(() => !this.loading() && this.error() !== null && !this.loaded());
  readonly showEmpty = computed(() => !this.loading() && this.loaded() && this.teams().length === 0);
  readonly showData = computed(() => this.loaded() && !this.showError() && this.teams().length > 0);

  constructor() {
    // Effect: persist selected team ID to localStorage
    effect(() => {
      const id = this.selectedTeamId();
      try {
        if (id !== null) {
          localStorage.setItem(SELECTED_TEAM_STORAGE_KEY, String(id));
        } else {
          localStorage.removeItem(SELECTED_TEAM_STORAGE_KEY);
        }
      } catch {
        // Handle storage quota or private browsing exceptions
      }
    });
  }

  ngOnInit(): void {
    this.teamStore.loadTeams();
    this.pokemonStore.loadPokemon();
  }

  /** Select or deselect a team */
  selectTeam(teamId: number): void {
    if (this.selectedTeamId() === teamId) {
      this.selectedTeamId.set(null);
    } else {
      this.selectedTeamId.set(teamId);
    }
  }

  /** Get Trainer by ID */
  getTrainer(trainerId: number): Trainer | undefined {
    return this.trainers().find((t) => t.id === trainerId);
  }

  /** Get Pokémon name by ID from cached data */
  getPokemonName(id: number): string {
    return this.allPokemon().find((p) => p.id === id)?.name ?? `#${id}`;
  }

  /** Get Pokémon sprite URL by ID */
  getPokemonSprite(id: number): string | null {
    return (
      this.allPokemon().find((p) => p.id === id)?.spriteUrl ??
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    );
  }

  /** Delete a team with confirmation */
  onDeleteTeam(team: Team, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(team.id);

    if (this.selectedTeamId() === team.id) {
      this.selectedTeamId.set(null);
    }

    this.teamStore.deleteTeam$(team.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.deletingId.set(null);
    });
  }

  onRetry(): void {
    this.teamStore.retry();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
