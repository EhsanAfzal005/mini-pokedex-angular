import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn,
} from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  first,
  of,
  Subject,
  startWith,
} from 'rxjs';
import { TeamStore } from '../state/team.store';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { Pokemon } from '../../pokedex/models/pokemon.model';
import {
  TYPE_COLORS,
  TEAM_NAME_MIN_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  MAX_TEAM_SIZE,
  MIN_TEAM_SIZE,
  SEARCH_DEBOUNCE_MS,
} from '../../common/constants/app.constants';

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-builder.component.html',
  styleUrl: './team-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeColors = TYPE_COLORS;
  readonly maxTeamSize = MAX_TEAM_SIZE;

  // Form
  readonly teamForm = this.fb.group({
    teamName: ['', [
      Validators.required,
      Validators.minLength(TEAM_NAME_MIN_LENGTH),
      Validators.maxLength(TEAM_NAME_MAX_LENGTH),
    ], [this.uniqueTeamNameValidator()]],
  });

  // Pokémon picker state
  readonly selectedPokemon = signal<Pokemon[]>([]);
  readonly pokemonSearch = signal('');
  readonly showAutocomplete = signal(false);
  readonly autocompleteResults = signal<Pokemon[]>([]);

  // Submission state
  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal<string | null>(null);

  // Store data
  readonly allPokemon = toSignal(this.pokemonStore.pokemon$, { initialValue: [] });
  readonly mutationError = toSignal(this.teamStore.mutationError$, { initialValue: null });

  // Form status bridge to signal
  readonly formStatus = toSignal(
    this.teamForm.statusChanges.pipe(startWith(this.teamForm.status)),
    { initialValue: this.teamForm.status }
  );

  readonly canAddMore = computed(() => this.selectedPokemon().length < this.maxTeamSize);
  readonly hasMinPokemon = computed(() => this.selectedPokemon().length >= MIN_TEAM_SIZE);
  readonly pokemonCountLabel = computed(() =>
    `${this.selectedPokemon().length}/${this.maxTeamSize} Pokémon selected`
  );

  /** Whether the form is valid overall (form + pokemon selection) */
  readonly isFormValid = computed(() =>
    this.formStatus() === 'VALID' && this.hasMinPokemon() && !this.isSubmitting()
  );

  /** Total base stats of selected team */
  readonly totalTeamStats = computed(() =>
    this.selectedPokemon().reduce((sum, p) => sum + p.totalStats, 0)
  );

  /** Type distribution of selected team */
  readonly typeDistribution = computed(() => {
    const counts: Record<string, number> = {};
    this.selectedPokemon().forEach((p) =>
      p.types.forEach((t) => { counts[t] = (counts[t] || 0) + 1; })
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  });

  private readonly searchInput$ = new Subject<string>();

  ngOnInit(): void {
    this.pokemonStore.loadPokemon();

    // Debounced autocomplete search
    this.searchInput$.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((query) => {
      if (!query.trim()) {
        this.autocompleteResults.set([]);
        this.showAutocomplete.set(false);
        return;
      }

      const results = this.allPokemon()
        .filter((p) => {
          const matchesName = p.name.toLowerCase().includes(query.toLowerCase());
          const isAlreadySelected = this.selectedPokemon().some((s) => s.id === p.id);
          return matchesName && !isAlreadySelected;
        })
        .slice(0, 10);

      this.autocompleteResults.set(results);
      this.showAutocomplete.set(results.length > 0);
    });
  }

  onPokemonSearchInput(query: string): void {
    this.pokemonSearch.set(query);
    this.searchInput$.next(query);
  }

  selectPokemon(pokemon: Pokemon): void {
    if (!this.canAddMore()) return;
    if (this.selectedPokemon().some((p) => p.id === pokemon.id)) return;

    this.selectedPokemon.set([...this.selectedPokemon(), pokemon]);
    this.pokemonSearch.set('');
    this.autocompleteResults.set([]);
    this.showAutocomplete.set(false);
  }

  removePokemon(pokemonId: number): void {
    this.selectedPokemon.set(this.selectedPokemon().filter((p) => p.id !== pokemonId));
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;
    this.teamForm.markAllAsTouched();
    if (this.teamForm.invalid) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    const teamName = this.teamForm.get('teamName')!.value!;
    const pokemonIds = this.selectedPokemon().map((p) => p.id);

    this.teamStore.createTeam$({
      trainer_id: 1,
      name: teamName,
      pokemon_ids: pokemonIds,
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (result) {
          this.submitSuccess.set(true);
          this.resetForm();
          setTimeout(() => this.submitSuccess.set(false), 3000);
        } else {
          this.submitError.set(this.mutationError() ?? 'Failed to create team');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('An unexpected error occurred');
      },
    });
  }

  onCloseAutocomplete(): void {
    setTimeout(() => this.showAutocomplete.set(false), 200);
  }

  getTypeColor(type: string): string {
    return this.typeColors[type] ?? '#777';
  }

  private resetForm(): void {
    this.teamForm.reset();
    this.selectedPokemon.set([]);
    this.pokemonSearch.set('');
  }

  /** Async validator: checks team name uniqueness against existing teams */
  private uniqueTeamNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return of(control.value).pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((name: string) =>
          this.teamStore.isTeamNameTaken$(name).pipe(
            map((taken) => (taken ? { uniqueName: true } : null)),
            first(),
          )
        ),
      );
    };
  }
}

