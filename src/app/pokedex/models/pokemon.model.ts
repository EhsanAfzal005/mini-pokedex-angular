/** Raw shape returned by PokéAPI GraphQL (supports v1beta2 and legacy v1beta schemas) */
export interface PokemonRaw {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemontypes?: {
    type: {
      name: string;
    };
  }[];
  pokemon_v2_pokemontypes?: {
    pokemon_v2_type: {
      name: string;
    };
  }[];
  pokemonstats?: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  pokemon_v2_pokemonstats?: {
    base_stat: number;
    pokemon_v2_stat: {
      name: string;
    };
  }[];
  pokemonsprites?: {
    sprites: any;
  }[];
  pokemon_v2_pokemonsprites?: {
    sprites: any;
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
  const statsList = raw.pokemonstats || raw.pokemon_v2_pokemonstats || [];
  const stats: PokemonStat[] = statsList.map((s: any) => ({
    name: s.stat?.name ?? s.pokemon_v2_stat?.name ?? '',
    baseStat: s.base_stat ?? 0,
  }));

  const typesList = raw.pokemontypes || raw.pokemon_v2_pokemontypes || [];
  const types: string[] = typesList.map((t: any) => t.type?.name ?? t.pokemon_v2_type?.name ?? '');

  let spriteUrl: string | null = null;
  const rawSprites = raw.pokemonsprites?.[0]?.sprites ?? raw.pokemon_v2_pokemonsprites?.[0]?.sprites;

  if (rawSprites) {
    if (typeof rawSprites === 'string') {
      try {
        const parsed = JSON.parse(rawSprites);
        spriteUrl =
          parsed?.other?.['official-artwork']?.front_default ??
          parsed?.front_default ??
          null;
      } catch {
        spriteUrl = null;
      }
    } else if (typeof rawSprites === 'object') {
      spriteUrl =
        rawSprites?.other?.['official-artwork']?.front_default ??
        rawSprites?.front_default ??
        null;
    }
  }

  // Reliable fallback to official artwork sprite by id
  if (!spriteUrl && raw.id) {
    spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${raw.id}.png`;
  }

  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    types,
    stats,
    spriteUrl,
    totalStats: stats.reduce((sum, s) => sum + s.baseStat, 0),
  };
}
