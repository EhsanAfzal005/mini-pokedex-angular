/**
 * GraphQL queries for PokéAPI.
 * Compatible with the active PokéAPI GraphQL endpoint (v1beta2).
 */

export const GET_POKEMON_LIST = `
  query GetPokemon($limit: Int, $offset: Int) {
    pokemon(limit: $limit, offset: $offset) {
      id
      name
      height
      weight
      pokemontypes {
        type {
          name
        }
      }
      pokemonstats {
        base_stat
        stat {
          name
        }
      }
      pokemonsprites {
        sprites
      }
    }
  }
`;

export const GET_POKEMON_ABILITIES = `
  query GetAbilities($pokemonId: Int!) {
    pokemonability(where: { pokemon_id: { _eq: $pokemonId } }) {
      ability {
        name
        abilityeffecttexts(where: { language_id: { _eq: 9 } }) {
          short_effect
        }
      }
      is_hidden
    }
  }
`;
