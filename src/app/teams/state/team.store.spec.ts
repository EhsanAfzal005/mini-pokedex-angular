import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeamStore } from './team.store';
import { TeamApiService } from '../../core/services/team-api.service';
import { Team } from '../models/team.model';

describe('TeamStore (Optimistic Updates & Rollback)', () => {
  let store: TeamStore;
  let apiMock: {
    fetchTeams$: ReturnType<typeof vi.fn>;
    fetchTrainers$: ReturnType<typeof vi.fn>;
    createTeam$: ReturnType<typeof vi.fn>;
    deleteTeam$: ReturnType<typeof vi.fn>;
  };

  const initialTeams: Team[] = [
    {
      id: 1,
      trainer_id: 1,
      name: 'Kanto Starters',
      pokemon_ids: [25, 6, 9],
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      trainer_id: 1,
      name: 'Johto Squad',
      pokemon_ids: [157, 181],
      created_at: '2024-03-20T14:30:00Z',
    },
  ];

  beforeEach(() => {
    apiMock = {
      fetchTeams$: vi.fn().mockReturnValue(of(initialTeams)),
      fetchTrainers$: vi.fn().mockReturnValue(of([])),
      createTeam$: vi.fn(),
      deleteTeam$: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        { provide: TeamApiService, useValue: apiMock },
      ],
    });

    store = TestBed.inject(TeamStore);
    store.loadTeams();
  });

  it('should optimistically add a team to the list immediately', () => {
    // Return a delayed or pending observable
    apiMock.createTeam$.mockReturnValue(of({
      id: 99,
      trainer_id: 1,
      name: 'Electric Team',
      pokemon_ids: [25],
      created_at: '2024-04-01T00:00:00Z',
    }));

    let currentTeams: Team[] = [];
    store.teams$.subscribe((teams) => (currentTeams = teams));

    expect(currentTeams.length).toBe(2);

    store.createTeam$({
      trainer_id: 1,
      name: 'Electric Team',
      pokemon_ids: [25],
    }).subscribe();

    // After success, it should have 3 teams and replace temp ID with 99
    expect(currentTeams.length).toBe(3);
    expect(currentTeams.some((t) => t.id === 99)).toBe(true);
  });

  it('should roll back optimistic team creation when the API mutation fails', () => {
    const networkError = new Error('Network failure: 500 Internal Server Error');
    apiMock.createTeam$.mockReturnValue(throwError(() => networkError));

    let currentTeams: Team[] = [];
    let mutationError: string | null = null;

    store.teams$.subscribe((teams) => (currentTeams = teams));
    store.mutationError$.subscribe((err) => (mutationError = err));

    expect(currentTeams.length).toBe(2);

    store.createTeam$({
      trainer_id: 1,
      name: 'Doomed Team',
      pokemon_ids: [1, 2],
    }).subscribe();

    // After failure, optimistic team must be rolled back
    expect(currentTeams.length).toBe(2);
    expect(currentTeams.some((t) => t.name === 'Doomed Team')).toBe(false);
    expect(mutationError).toBe('Network failure: 500 Internal Server Error');
  });

  it('should roll back optimistic team deletion when the API mutation fails', () => {
    const error = new Error('Failed to delete');
    apiMock.deleteTeam$.mockReturnValue(throwError(() => error));

    let currentTeams: Team[] = [];
    let mutationError: string | null = null;

    store.teams$.subscribe((teams) => (currentTeams = teams));
    store.mutationError$.subscribe((err) => (mutationError = err));

    expect(currentTeams.length).toBe(2);

    store.deleteTeam$(1).subscribe();

    // Rollback restored the deleted team
    expect(currentTeams.length).toBe(2);
    expect(currentTeams.some((t) => t.id === 1)).toBe(true);
    expect(mutationError).toBe('Failed to delete');
  });
});
