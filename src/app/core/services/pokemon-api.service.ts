import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, retry, timer, catchError, throwError } from 'rxjs';
import { PokemonRaw, PokemonAbility } from '../../pokedex/models/pokemon.model';
import { GET_POKEMON_LIST, GET_POKEMON_ABILITIES } from '../graphql/pokemon-api.graphql';

// Active PokéAPI GraphQL endpoint
const POKEAPI_URL = 'https://graphql.pokeapi.co/v1beta2';
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

interface RawAbilityEntry {
  ability?: {
    name: string;
    abilityeffecttexts: { short_effect: string }[];
  };
  pokemon_v2_ability?: {
    name: string;
    pokemon_v2_abilityeffecttexts: { short_effect: string }[];
  };
  is_hidden?: boolean;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch a paginated list of Pokémon with types, stats, and sprites.
   * Retries up to 3 times with incremental delay on failure.
   */
  fetchPokemonList$(limit: number, offset: number): Observable<PokemonRaw[]> {
    return this.http
      .post<GraphQLResponse<{ pokemon?: PokemonRaw[]; pokemon_v2_pokemon?: PokemonRaw[] }>>(
        POKEAPI_URL,
        {
          query: GET_POKEMON_LIST,
          variables: { limit, offset },
        }
      )
      .pipe(
        retry({
          count: RETRY_COUNT,
          delay: (_error, retryCount) => timer(RETRY_DELAY_MS * retryCount),
        }),
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          const list = res.data?.pokemon ?? res.data?.pokemon_v2_pokemon;
          if (!list) {
            throw new Error('No Pokémon data returned from GraphQL API');
          }
          return list;
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch Pokémon list';
          return throwError(() => new Error(message));
        }),
      );
  }

  /**
   * Fetch abilities for a single Pokémon by ID.
   * Retries up to 3 times with incremental delay on failure.
   */
  fetchPokemonAbilities$(pokemonId: number): Observable<PokemonAbility[]> {
    return this.http
      .post<GraphQLResponse<{
        pokemonability?: {
          ability: {
            name: string;
            abilityeffecttexts: { short_effect: string }[];
          };
          is_hidden: boolean;
        }[];
        pokemon_v2_pokemonability?: {
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
        retry({
          count: RETRY_COUNT,
          delay: (_error, retryCount) => timer(RETRY_DELAY_MS * retryCount),
        }),
        map((res) => {
          if (res.errors?.length) {
            throw new Error(res.errors[0].message);
          }
          const abilities = (res.data?.pokemonability ?? res.data?.pokemon_v2_pokemonability) as RawAbilityEntry[] | undefined;
          if (!abilities) return [];

          return abilities.map((a: RawAbilityEntry) => {
            const abilityObj = a.ability;
            const v2AbilityObj = a.pokemon_v2_ability;
            const name = abilityObj?.name ?? v2AbilityObj?.name ?? '';
            const effectTexts =
              abilityObj?.abilityeffecttexts ??
              v2AbilityObj?.pokemon_v2_abilityeffecttexts ??
              [];
            return {
              name,
              shortEffect: effectTexts[0]?.short_effect ?? '',
              isHidden: a.is_hidden ?? false,
            };
          });
        }),
        catchError((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to fetch abilities';
          return throwError(() => new Error(message));
        }),
      );
  }
}
