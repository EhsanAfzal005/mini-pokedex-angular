/** GraphQL queries/mutations for the local mock server (json-graphql-server on port 4000) */

export const GET_ALL_TEAMS = `
  query GetAllTeams {
    allTeams {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

export const GET_TEAM = `
  query GetTeam($id: ID!) {
    Team(id: $id) {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

export const CREATE_TEAM = `
  mutation CreateTeam($trainer_id: ID!, $name: String!, $pokemon_ids: [Int]!, $created_at: String!) {
    createTeam(trainer_id: $trainer_id, name: $name, pokemon_ids: $pokemon_ids, created_at: $created_at) {
      id
      trainer_id
      name
      pokemon_ids
      created_at
    }
  }
`;

export const DELETE_TEAM = `
  mutation DeleteTeam($id: ID!) {
    removeTeam(id: $id) {
      id
    }
  }
`;

export const GET_ALL_TRAINERS = `
  query GetAllTrainers {
    allTrainers {
      id
      name
      region
      avatar_url
    }
  }
`;
