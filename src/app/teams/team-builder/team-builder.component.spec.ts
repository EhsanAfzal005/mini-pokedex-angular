import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { TeamBuilderComponent } from './team-builder.component';
import { TeamStore } from '../state/team.store';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { Pokemon } from '../../pokedex/models/pokemon.model';

describe('TeamBuilderComponent (Reactive Form & Validation)', () => {
  let component: TeamBuilderComponent;
  let teamStoreMock: {
    isTeamNameTaken$: ReturnType<typeof vi.fn>;
    createTeam$: ReturnType<typeof vi.fn>;
    mutationError$: Observable<string | null>;
    trainers$: Observable<any[]>;
  };
  let pokemonStoreMock: {
    loadPokemon: ReturnType<typeof vi.fn>;
    pokemon$: Observable<Pokemon[]>;
  };

  const samplePokemon: Pokemon = {
    id: 25,
    name: 'pikachu',
    height: 4,
    weight: 60,
    types: ['electric'],
    stats: [
      { name: 'hp', baseStat: 35 },
      { name: 'attack', baseStat: 55 },
      { name: 'defense', baseStat: 40 },
      { name: 'special-attack', baseStat: 50 },
      { name: 'special-defense', baseStat: 50 },
      { name: 'speed', baseStat: 90 },
    ],
    spriteUrl: 'https://example.com/25.png',
    totalStats: 320,
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    teamStoreMock = {
      isTeamNameTaken$: vi.fn().mockImplementation((name: string) => {
        const taken = ['Kanto Starters', 'Johto Squad'].some(
          (existing) => existing.toLowerCase() === name.toLowerCase()
        );
        return of(taken);
      }),
      createTeam$: vi.fn().mockReturnValue(of({
        id: 10,
        trainer_id: 1,
        name: 'New Squad',
        pokemon_ids: [25],
        created_at: '2024-04-01T00:00:00Z',
      })),
      mutationError$: of(null),
      trainers$: of([
        { id: 1, name: 'Ash Ketchum', region: 'Kanto', avatar_url: '' },
        { id: 2, name: 'Misty', region: 'Kanto', avatar_url: '' },
      ]),
    };

    pokemonStoreMock = {
      loadPokemon: vi.fn(),
      pokemon$: of([samplePokemon]),
    };

    await TestBed.configureTestingModule({
      imports: [TeamBuilderComponent, ReactiveFormsModule],
      providers: [
        { provide: TeamStore, useValue: teamStoreMock },
        { provide: PokemonStore, useValue: pokemonStoreMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TeamBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize form with empty teamName and require it', () => {
    const nameControl = component.teamForm.get('teamName');
    expect(nameControl?.value).toBe('');
    expect(nameControl?.valid).toBe(false);
    expect(nameControl?.errors?.['required']).toBe(true);
  });

  it('should invalidate team name shorter than 3 characters or longer than 30', () => {
    const nameControl = component.teamForm.get('teamName');

    nameControl?.setValue('ab');
    expect(nameControl?.errors?.['minlength']).toBeTruthy();

    nameControl?.setValue('a'.repeat(31));
    expect(nameControl?.errors?.['maxlength']).toBeTruthy();

    nameControl?.setValue('Rocket Squad');
    expect(nameControl?.errors?.['minlength']).toBeFalsy();
    expect(nameControl?.errors?.['maxlength']).toBeFalsy();
  });

  it('should asynchronously reject duplicate team names via async validator', () => {
    const nameControl = component.teamForm.get('teamName');

    // "Kanto Starters" is already taken
    nameControl?.setValue('Kanto Starters');
    vi.advanceTimersByTime(350);

    expect(nameControl?.errors?.['uniqueName']).toBe(true);
    expect(nameControl?.valid).toBe(false);

    // Case-insensitive duplicate check
    nameControl?.setValue('kanto starters');
    vi.advanceTimersByTime(350);

    expect(nameControl?.errors?.['uniqueName']).toBe(true);

    // Unique name
    nameControl?.setValue('Thunder Squad');
    vi.advanceTimersByTime(350);

    expect(nameControl?.errors?.['uniqueName']).toBeFalsy();
    expect(nameControl?.valid).toBe(true);
  });

  it('should require at least 1 Pokémon to make the form valid', () => {
    const nameControl = component.teamForm.get('teamName');
    nameControl?.setValue('Thunder Squad');
    vi.advanceTimersByTime(350);

    // No pokemon selected yet
    expect(component.hasMinPokemon()).toBe(false);
    expect(component.isFormValid()).toBe(false);

    // Select a Pokémon
    component.selectPokemon(samplePokemon);
    expect(component.hasMinPokemon()).toBe(true);
    expect(component.selectedPokemon().length).toBe(1);
    expect(component.isFormValid()).toBe(true);
  });

  it('should limit team to maximum 6 Pokémon and compute team stats', () => {
    for (let i = 1; i <= 6; i++) {
      component.selectPokemon({
        ...samplePokemon,
        id: i,
        name: `poke-${i}`,
      });
    }

    expect(component.selectedPokemon().length).toBe(6);
    expect(component.canAddMore()).toBe(false);

    // Attempting to add a 7th should be ignored
    component.selectPokemon({
      ...samplePokemon,
      id: 7,
      name: 'poke-7',
    });
    expect(component.selectedPokemon().length).toBe(6);

    // Total stats computed: 6 * 320 = 1920
    expect(component.totalTeamStats()).toBe(1920);
  });
});
