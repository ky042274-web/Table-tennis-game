export type GameState = 
  | 'menu' 
  | 'serving' 
  | 'rally' 
  | 'point_over' 
  | 'game_over' 
  | 'paused';

export type GameMode = 'quick' | 'tournament' | 'practice';
export type CourtSurface = 'grass' | 'clay' | 'hard' | 'night';
export type CourtSide = 'near' | 'far'; // near = player (bottom), far = AI (top)
export type ServeSide = 'deuce' | 'ad'; // deuce = right, ad = left

export type ShotType = 'flat' | 'topspin' | 'slice' | 'lob' | 'smash' | 'serve';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface CharacterPreset {
  id: string;
  name: string;
  tag: string;
  country: string;
  jerseyColor: number;
  shortsColor: number;
  skinColor: number;
  hairColor: number;
  headbandColor: number;
  racketColor: number;
  speedBonus: number;
  powerBonus: number;
  accentHex: string;
}

export interface SetScore {
  player: number;
  ai: number;
}

export interface ScoreState {
  playerPoints: number; // 0, 1, 2, 3, 4 (Love, 15, 30, 40, Ad) or tiebreak points
  aiPoints: number;
  playerGames: number;
  aiGames: number;
  playerSets: number;
  aiSets: number;
  setHistory: SetScore[];
  isTiebreak: boolean;
  currentServer: 'player' | 'ai';
  serveSide: ServeSide;
  isDeuce: boolean;
  isAdPlayer: boolean;
  isAdAi: boolean;
  scoreDisplay: {
    player: string; // "0", "15", "30", "40", "AD" or tiebreak number
    ai: string;
  };
  servingFaultCount: number; // 0 = first serve, 1 = second serve
}

export interface MatchStats {
  acesPlayer: number;
  acesAi: number;
  winnersPlayer: number;
  winnersAi: number;
  unforcedErrorsPlayer: number;
  unforcedErrorsAi: number;
  powerShotsPlayer: number;
  totalPointsPlayer: number;
  totalPointsAi: number;
  maxRally: number;
  currentRally: number;
  lastServeSpeedKmh: number;
  fastestServeKmh: number;
  practiceScore: number;
  practiceBestStreak: number;
}

export interface GameSettings {
  mode: GameMode;
  surface: CourtSurface;
  difficulty: DifficultyLevel;
  gamesToWinSet: number; // 1, 3, or 6
  setsToWinMatch: number; // 1 or 2 (Best of 3)
  characterId: string;
  soundEnabled: boolean;
  soundVolume: number;
  cameraDynamic: boolean;
  autoAssist: boolean; // Gentle movement assist on easy/kids mode
}

export interface LineCallInfo {
  isIn: boolean;
  distanceCm: number;
  lineName: string;
}

export interface PointAnnouncement {
  title: string;
  subtitle?: string;
  type: 'ace' | 'winner' | 'fault' | 'double_fault' | 'out' | 'net' | 'deuce' | 'game' | 'set' | 'match' | 'smash' | 'let';
  lineCall?: LineCallInfo;
  time: number;
}

export interface TournamentProgress {
  round: number; // 1 = Quarterfinal, 2 = Semifinal, 3 = Final
  roundName: string;
  opponentName: string;
  wonTournament: boolean;
}
