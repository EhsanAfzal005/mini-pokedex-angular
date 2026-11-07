import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Team, CreateTeamInput, Trainer } from '../../teams/models/team.model';
import { GET_ALL_TEAMS, CREATE_TEAM, DELETE_TEAM, GET_ALL_TRAINERS } from '../graphql/team-api.graphql';

const MOCK_API_URL = 'http://localhost:4000';

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);

  /** Fetch all teams from the local mock server */
  fetchTeams$(): Observable<Team[]> {
    return this.http
      .post<GraphQLResponse<{ allTeams: Array<{ id: string | number; trainer_id: string | number; name: string; pokemon_ids: number[]; created_at: string }> }>>(MOCK_API_URL, {
        query: GET_ALL_TEAMS,
      })
      .pipe(
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          return res.data.allTeams.map((t) => ({
            ...t,
            id: Number(t.id),
            trainer_id: Number(t.trainer_id),
            pokemon_ids: (t.pokemon_ids || []).map(Number),
          }));
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch teams';
          return throwError(() => new Error(message));
        }),
      );
  }

  /** Fetch all trainers from the local mock server */
  fetchTrainers$(): Observable<Trainer[]> {
    return this.http
      .post<GraphQLResponse<{ allTrainers: Array<{ id: string | number; name: string; region: string; avatar_url: string }> }>>(MOCK_API_URL, {
        query: GET_ALL_TRAINERS,
      })
      .pipe(
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          return res.data.allTrainers.map((t) => ({
            ...t,
            id: Number(t.id),
          }));
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch trainers';
          return throwError(() => new Error(message));
        }),
      );
  }

  /** Create a new team via mutation */
  createTeam$(input: CreateTeamInput): Observable<Team> {
    return this.http
      .post<GraphQLResponse<{ createTeam: { id: string | number; trainer_id: string | number; name: string; pokemon_ids: number[]; created_at: string } }>>(MOCK_API_URL, {
        query: CREATE_TEAM,
        variables: {
          trainer_id: String(input.trainer_id),
          name: input.name,
          pokemon_ids: input.pokemon_ids,
          created_at: new Date().toISOString(),
        },
      })
      .pipe(
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          const team = res.data.createTeam;
          return {
            ...team,
            id: Number(team.id),
            trainer_id: Number(team.trainer_id),
            pokemon_ids: (team.pokemon_ids || []).map(Number),
          };
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to create team';
          return throwError(() => new Error(message));
        }),
      );
  }

  /** Delete a team by ID */
  deleteTeam$(id: number): Observable<void> {
    return this.http
      .post<GraphQLResponse<{ removeTeam: { id: number } }>>(MOCK_API_URL, {
        query: DELETE_TEAM,
        variables: { id: String(id) },
      })
      .pipe(
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to delete team';
          return throwError(() => new Error(message));
        }),
      );
  }
}
