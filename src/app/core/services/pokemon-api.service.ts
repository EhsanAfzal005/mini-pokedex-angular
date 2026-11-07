import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, retry, timer, catchError, throwError } from 'rxjs';
import { PokemonRaw, PokemonAbility } from '../../pokedex/models/pokemon.model';
import { GET_POKEMON_LIST, GET_POKEMON_ABILITIES } from '../graphql/pokemon-api.graphql';

const POKEAPI_URL = 'https://beta.pokeapi.co/graphql/v1beta';
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch a paginated list of Pokémon with types, stats, and sprites.
   * Retries up to 3 times with 1s delay on failure.
   */
  fetchPokemonList$(limit: number, offset: number): Observable<PokemonRaw[]> {
    return this.http
      .post<GraphQLResponse<{ pokemon_v2_pokemon: PokemonRaw[] }>>(POKEAPI_URL, {
        query: GET_POKEMON_LIST,
        variables: { limit, offset },
      })
      .pipe(
        retry({ count: RETRY_COUNT, delay: (_error, retryCount) => timer(RETRY_DELAY_MS * retryCount) }),
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          return res.data.pokemon_v2_pokemon;
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch Pokémon list';
          return throwError(() => new Error(message));
        }),
      );
  }

  /**
   * Fetch abilities for a single Pokémon by ID.
   * Retries up to 3 times with 1s delay on failure.
   */
  fetchPokemonAbilities$(pokemonId: number): Observable<PokemonAbility[]> {
    return this.http
      .post<GraphQLResponse<{
        pokemon_v2_pokemonability: {
          pokemon_v2_ability: {
            name: string;
            pokemon_v2_abilityeffecttexts: { short_effect: string }[];
          };
          is_hidden: boolean;
        }[];
      }>>(POKEAPI_URL, {
        query: GET_POKEMON_ABILITIES,
        variables: { pokemonId },
      })
      .pipe(
        retry({ count: RETRY_COUNT, delay: (_error, retryCount) => timer(RETRY_DELAY_MS * retryCount) }),
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          return res.data.pokemon_v2_pokemonability.map((a) => ({
            name: a.pokemon_v2_ability.name,
            shortEffect: a.pokemon_v2_ability.pokemon_v2_abilityeffecttexts[0]?.short_effect ?? '',
            isHidden: a.is_hidden,
          }));
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch abilities';
          return throwError(() => new Error(message));
        }),
      );
  }
}
