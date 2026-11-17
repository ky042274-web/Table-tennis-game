import { CharacterPreset, CourtSurface } from '../types/tennis';

export interface SurfaceConfig {
  id: CourtSurface;
  name: string;
  label: string;
  innerColor: number;
  outerColor: number;
  stadiumGrassColor: number;
  lineColor: number;
  skyColor: number;
  fogDensity: number;
  restitution: number;     // bounce height factor
  horizontalDamp: number;  // bounce friction factor (lower = slower skid)
  dustColor: number;
  ambientIntensity: number;
  keyLightIntensity: number;
  isNight: boolean;
}

export const COURT_SURFACES: Record<CourtSurface, SurfaceConfig> = {
  grass: {
    id: 'grass',
    name: 'All-England Grass',
    label: 'GRASS',
    innerColor: 0x2e8b45,
    outerColor: 0x206030,
    stadiumGrassColor: 0x164220,
    lineColor: 0xffffff,
    skyColor: 0x38bdf8,
    fogDensity: 0.008,
    restitution: 0.70,
    horizontalDamp: 0.92, // fast low skid
    dustColor: 0x86efac,
    ambientIntensity: 1.0,
    keyLightIntensity: 1.75,
    isNight: false,
  },
  clay: {
    id: 'clay',
    name: 'Roland Red Clay',
    label: 'CLAY',
    innerColor: 0xc25932,
    outerColor: 0x9e4222,
    stadiumGrassColor: 0x26522e,
    lineColor: 0xf8fafc,
    skyColor: 0x60a5fa,
    fogDensity: 0.007,
    restitution: 0.80, // high bouncy clay
    horizontalDamp: 0.82, // slower grip bounce
    dustColor: 0xfb923c,
    ambientIntensity: 1.05,
    keyLightIntensity: 1.85,
    isNight: false,
  },
  hard: {
    id: 'hard',
    name: 'Pro Blue Hard',
    label: 'HARD',
    innerColor: 0x1d6fa5,
    outerColor: 0x15803d,
    stadiumGrassColor: 0x0f172a,
    lineColor: 0xffffff,
    skyColor: 0x2563eb,
    fogDensity: 0.009,
    restitution: 0.75,
    horizontalDamp: 0.88,
    dustColor: 0x93c5fd,
    ambientIntensity: 0.95,
    keyLightIntensity: 1.7,
    isNight: false,
  },
  night: {
    id: 'night',
    name: 'Grand Night Arena',
    label: 'NIGHT',
    innerColor: 0x0e7490,
    outerColor: 0x1e293b,
    stadiumGrassColor: 0x020617,
    lineColor: 0xf8fafc,
    skyColor: 0x090d16,
    fogDensity: 0.011,
    restitution: 0.76,
    horizontalDamp: 0.89,
    dustColor: 0x38bdf8,
    ambientIntensity: 0.75,
    keyLightIntensity: 1.5,
    isNight: true,
  },
};

export const PLAYABLE_CHARACTERS: CharacterPreset[] = [
  {
    id: 'alex',
    name: 'Alex',
    tag: 'All-Rounder',
    country: 'BLU',
    jerseyColor: 0x0284c7,
    shortsColor: 0xffffff,
    skinColor: 0xffd1a4,
    hairColor: 0x472d17,
    headbandColor: 0xe0e7ff,
    racketColor: 0xef4444,
    speedBonus: 1.0,
    powerBonus: 1.0,
    accentHex: '#38bdf8',
  },
  {
    id: 'maya',
    name: 'Maya',
    tag: 'Speedster',
    country: 'GLD',
    jerseyColor: 0xf59e0b,
    shortsColor: 0x0f172a,
    skinColor: 0x8d5524,
    hairColor: 0x1e1b4b,
    headbandColor: 0xfef08a,
    racketColor: 0x06b6d4,
    speedBonus: 1.12,
    powerBonus: 0.96,
    accentHex: '#fbbf24',
  },
  {
    id: 'leo',
    name: 'Leo',
    tag: 'Power Ace',
    country: 'RED',
    jerseyColor: 0xdc2626,
    shortsColor: 0xf8fafc,
    skinColor: 0xf1c27d,
    hairColor: 0x92400e,
    headbandColor: 0xffffff,
    racketColor: 0xfacc15,
    speedBonus: 0.96,
    powerBonus: 1.12,
    accentHex: '#f87171',
  },
  {
    id: 'zoe',
    name: 'Zoe',
    tag: 'Spin Pro',
    country: 'VLT',
    jerseyColor: 0x7c3aed,
    shortsColor: 0xe2e8f0,
    skinColor: 0xffdbac,
    hairColor: 0x0f172a,
    headbandColor: 0x34d399,
    racketColor: 0xec4899,
    speedBonus: 1.05,
    powerBonus: 1.04,
    accentHex: '#a78bfa',
  },
];

export interface TournamentOpponent {
  round: number;
  roundName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  character: CharacterPreset;
}

export const TOURNAMENT_OPPONENTS: TournamentOpponent[] = [
  {
    round: 1,
    roundName: 'QUARTERFINAL',
    difficulty: 'easy',
    character: {
      id: 'cpu_rookie',
      name: 'Sam',
      tag: 'Rising Challenger',
      country: 'CPU',
      jerseyColor: 0x10b981,
      shortsColor: 0x1e293b,
      skinColor: 0xf1c27d,
      hairColor: 0x78350f,
      headbandColor: 0xffffff,
      racketColor: 0x38bdf8,
      speedBonus: 0.95,
      powerBonus: 0.95,
      accentHex: '#34d399',
    },
  },
  {
    round: 2,
    roundName: 'SEMIFINAL',
    difficulty: 'medium',
    character: {
      id: 'cpu_pro',
      name: 'Elena',
      tag: 'Tour Tactician',
      country: 'CPU',
      jerseyColor: 0xe11d48,
      shortsColor: 0x1e293b,
      skinColor: 0xe0a97a,
      hairColor: 0x1e293b,
      headbandColor: 0xfacc15,
      racketColor: 0x22c55e,
      speedBonus: 1.02,
      powerBonus: 1.02,
      accentHex: '#fb7185',
    },
  },
  {
    round: 3,
    roundName: 'CHAMPIONSHIP FINAL',
    difficulty: 'hard',
    character: {
      id: 'cpu_champ',
      name: 'Viktor',
      tag: 'Grand Slam King',
      country: 'PRO',
      jerseyColor: 0x1e293b,
      shortsColor: 0x0f172a,
      skinColor: 0xffd1a4,
      hairColor: 0xfbbf24,
      headbandColor: 0xfacc15,
      racketColor: 0xfacc15,
      speedBonus: 1.1,
      powerBonus: 1.1,
      accentHex: '#facc15',
    },
  },
];
