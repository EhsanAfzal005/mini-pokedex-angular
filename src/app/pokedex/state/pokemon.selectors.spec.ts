import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PokemonSelectors } from './pokemon.selectors';
import { PokemonStore } from './pokemon.store';
import { Pokemon } from '../models/pokemon.model';

describe('PokemonSelectors (Derived Observables & Reactive Filtering)', () => {
  let selectors: PokemonSelectors;
  let pokemonSubject: BehaviorSubject<Pokemon[]>;

  const mockPokemonList: Pokemon[] = [
    {
      id: 1,
      name: 'bulbasaur',
      height: 7,
      weight: 69,
      types: ['grass', 'poison'],
      stats: [
        { name: 'hp', baseStat: 45 },
        { name: 'attack', baseStat: 49 },
        { name: 'defense', baseStat: 49 },
        { name: 'special-attack', baseStat: 65 },
        { name: 'special-defense', baseStat: 65 },
        { name: 'speed', baseStat: 45 },
      ],
      spriteUrl: 'https://example.com/1.png',
      totalStats: 318,
    },
    {
      id: 4,
      name: 'charmander',
      height: 6,
      weight: 85,
      types: ['fire'],
      stats: [
        { name: 'hp', baseStat: 39 },
        { name: 'attack', baseStat: 52 },
        { name: 'defense', baseStat: 43 },
        { name: 'special-attack', baseStat: 60 },
        { name: 'special-defense', baseStat: 50 },
        { name: 'speed', baseStat: 65 },
      ],
      spriteUrl: 'https://example.com/4.png',
      totalStats: 309,
    },
    {
      id: 7,
      name: 'squirtle',
      height: 5,
      weight: 90,
      types: ['water'],
      stats: [
        { name: 'hp', baseStat: 44 },
        { name: 'attack', baseStat: 48 },
        { name: 'defense', baseStat: 65 },
        { name: 'special-attack', baseStat: 50 },
        { name: 'special-defense', baseStat: 64 },
        { name: 'speed', baseStat: 43 },
      ],
      spriteUrl: 'https://example.com/7.png',
      totalStats: 314,
    },
    {
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
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    pokemonSubject = new BehaviorSubject<Pokemon[]>(mockPokemonList);

    const storeMock = {
      pokemon$: pokemonSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        PokemonSelectors,
        { provide: PokemonStore, useValue: storeMock },
      ],
    });

    selectors = TestBed.inject(PokemonSelectors);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should extract all unique available types in sorted order', () => {
    let types: string[] = [];
    selectors.availableTypes$.subscribe((res) => (types = res));

    expect(types).toEqual(['electric', 'fire', 'grass', 'poison', 'water']);
  });

  it('should filter Pokémon by debounced search query', () => {
    let filtered: Pokemon[] = [];
    selectors.filteredPokemon$.subscribe((res) => (filtered = res));

    vi.advanceTimersByTime(350);
    expect(filtered.length).toBe(4);

    selectors.setSearchQuery('char');
    vi.advanceTimersByTime(350);

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('charmander');

    selectors.setSearchQuery('  pika  ');
    vi.advanceTimersByTime(350);

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('pikachu');
  });

  it('should filter Pokémon by selected type', () => {
    let filtered: Pokemon[] = [];
    selectors.filteredPokemon$.subscribe((res) => (filtered = res));

    vi.advanceTimersByTime(350);
    selectors.setTypeFilter('fire');

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('charmander');

    selectors.setTypeFilter('poison');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('bulbasaur');
  });

  it('should sort Pokémon by specific stat column ascending and descending', () => {
    let sorted: Pokemon[] = [];
    selectors.sortedPokemon$.subscribe((res) => (sorted = res));
    vi.advanceTimersByTime(350);

    selectors.setSort('speed', 'asc');
    expect(sorted[0].name).toBe('squirtle'); // speed 43
    expect(sorted[sorted.length - 1].name).toBe('pikachu'); // speed 90

    selectors.setSort('speed', 'desc');
    expect(sorted[0].name).toBe('pikachu'); // speed 90
    expect(sorted[sorted.length - 1].name).toBe('squirtle'); // speed 43

    selectors.setSort('totalStats', 'desc');
    expect(sorted[0].name).toBe('pikachu'); // total 320
  });

  it('should paginate items correctly based on pageIndex and pageSize', () => {
    let paged: Pokemon[] = [];
    selectors.pagedPokemon$.subscribe((res) => (paged = res));
    vi.advanceTimersByTime(350);

    selectors.setPageSize(2);
    selectors.setPage(0);
    expect(paged.length).toBe(2);

    selectors.setPage(1);
    expect(paged.length).toBe(2);
  });

  it('should report isEmpty$ true when no Pokémon match the filter', () => {
    let isEmpty = false;
    selectors.isEmpty$.subscribe((res) => (isEmpty = res));
    vi.advanceTimersByTime(350);

    expect(isEmpty).toBe(false);

    selectors.setSearchQuery('mewtwo-not-here');
    vi.advanceTimersByTime(350);

    expect(isEmpty).toBe(true);
  });
});
