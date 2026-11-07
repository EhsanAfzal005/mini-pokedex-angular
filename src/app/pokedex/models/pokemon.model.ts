/** Raw shape returned by PokéAPI GraphQL */
export interface PokemonRaw {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemontypes: {
    pokemon_v2_type: {
      name: string;
    };
  }[];
  pokemon_v2_pokemonstats: {
    base_stat: number;
    pokemon_v2_stat: {
      name: string;
    };
  }[];
  pokemon_v2_pokemonsprites: {
    sprites: string;
  }[];
}

/** Cleaned Pokémon for app consumption */
export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  stats: PokemonStat[];
  spriteUrl: string | null;
  totalStats: number;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
}

export interface PokemonAbility {
  name: string;
  shortEffect: string;
  isHidden: boolean;
}

/** Stat names in display order */
export const STAT_NAMES = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;

/** Display labels for stats */
export const STAT_LABELS: Record<string, string> = {
  'hp': 'HP',
  'attack': 'Attack',
  'defense': 'Defense',
  'special-attack': 'Sp.Atk',
  'special-defense': 'Sp.Def',
  'speed': 'Speed',
};

/** Map raw API response to app Pokemon model */
export function mapRawToPokemon(raw: PokemonRaw): Pokemon {
  const stats: PokemonStat[] = raw.pokemon_v2_pokemonstats.map((s) => ({
    name: s.pokemon_v2_stat.name,
    baseStat: s.base_stat,
  }));

  let spriteUrl: string | null = null;
  if (raw.pokemon_v2_pokemonsprites?.[0]?.sprites) {
    try {
      const parsed = JSON.parse(raw.pokemon_v2_pokemonsprites[0].sprites);
      spriteUrl = parsed?.other?.['official-artwork']?.front_default
        ?? parsed?.front_default
        ?? null;
    } catch {
      spriteUrl = null;
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    types: raw.pokemon_v2_pokemontypes.map((t) => t.pokemon_v2_type.name),
    stats,
    spriteUrl,
    totalStats: stats.reduce((sum, s) => sum + s.baseStat, 0),
  };
}
