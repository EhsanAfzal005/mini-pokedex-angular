/** Team as returned by the local mock GraphQL server */
export interface Team {
  id: number;
  trainer_id: number;
  name: string;
  pokemon_ids: number[];
  created_at: string;
}

/** Input for creating a new team */
export interface CreateTeamInput {
  trainer_id: number;
  name: string;
  pokemon_ids: number[];
}

/** Trainer from the local mock */
export interface Trainer {
  id: number;
  name: string;
  region: string;
  avatar_url: string;
}
