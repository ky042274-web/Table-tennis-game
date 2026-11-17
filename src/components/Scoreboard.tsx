import React from 'react';
import { ScoreState, MatchStats, GameMode, TournamentProgress } from '../types/tennis';

interface ScoreboardProps {
  score: ScoreState;
  stats: MatchStats;
  powerCharge: number;
  mode: GameMode;
  playerName: string;
  opponentName: string;
  tournament: TournamentProgress;
}

const TennisBallIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#d9f99d" stroke="#84cc16" strokeWidth="1.5" />
    <path d="M6 5 C10 9, 10 15, 6 19" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M18 5 C14 9, 14 15, 18 19" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const Scoreboard: React.FC<ScoreboardProps> = ({
  score,
  stats,
  powerCharge,
  mode,
  playerName,
  opponentName,
  tournament,
}) => {
  const isPlayerServer = score.currentServer === 'player';
  const isAiServer = score.currentServer === 'ai';

  const isDeuce = score.isDeuce;
  const isBreakPoint =
    !score.isTiebreak &&
    ((score.currentServer === 'ai' && score.playerPoints >= 3 && score.playerPoints > score.aiPoints) ||
      (score.currentServer === 'player' && score.aiPoints >= 3 && score.aiPoints > score.playerPoints));

  if (mode === 'practice') {
    return (
      <div className="select-none flex flex-col items-center pointer-events-none">
        <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-700/80 rounded-xl px-5 py-2 shadow-2xl">
          <div className="text-center">
            <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">SCORE</span>
            <span className="text-xl font-black text-white tabular-nums">{stats.practiceScore}</span>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-center">
            <span className="text-[10px] font-bold text-yellow-400 block uppercase tracking-wider">RALLY</span>
            <span className="text-xl font-black text-yellow-300 tabular-nums">{stats.currentRally}</span>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-center">
            <span className="text-[10px] font-bold text-sky-400 block uppercase tracking-wider">BEST</span>
            <span className="text-xl font-black text-sky-300 tabular-nums">{stats.practiceBestStreak}</span>
          </div>
        </div>
        <div className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950/85 border border-slate-700/80 text-[10px] font-bold text-amber-300 tracking-wide">
          HIT THE GOLD TARGET FOR +100 BONUS!
        </div>
      </div>
    );
  }

  return (
    <div className="select-none flex flex-col items-center pointer-events-none">
      {/* Broadcast Style Main Scoreboard */}
      <div className="flex items-stretch bg-slate-950/92 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden">
        {/* Tournament Brand Tab */}
        <div className="bg-gradient-to-b from-emerald-600 to-green-700 px-3 py-1.5 flex flex-col justify-center items-center text-white border-r border-emerald-500/50">
          <span className="text-[9px] font-black tracking-widest uppercase">
            {mode === 'tournament' ? `RND ${tournament.round}` : 'ARENA'}
          </span>
          <span className="text-[11px] font-extrabold tracking-tight">
            {mode === 'tournament' ? 'CUP' : 'OPEN'}
          </span>
        </div>

        {/* Players & Scores Grid */}
        <div className="divide-y divide-slate-800 text-sm">
          {/* Player Row */}
          <div className="flex items-center px-3 py-1.5 gap-2.5 bg-slate-900/75">
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              {isPlayerServer && <TennisBallIcon />}
            </div>

            <div className="flex items-center gap-1.5 w-24 sm:w-28">
              <span className="px-1 py-0.5 rounded bg-blue-600 text-white font-mono text-[9px] font-bold">
                YOU
              </span>
              <span className="font-bold text-slate-100 truncate text-xs sm:text-sm uppercase">
                {playerName}
              </span>
            </div>

            {/* Sets History */}
            {score.setHistory.map((s, idx) => (
              <div key={idx} className="w-5 text-center font-bold text-slate-400 text-xs tabular-nums">
                {s.player}
              </div>
            ))}

            {/* Current Set Games Won */}
            <div className="w-7 text-center font-black text-slate-200 text-sm sm:text-base tabular-nums">
              {score.playerGames}
            </div>

            {/* Current Game Points */}
            <div
              className={`w-10 text-center font-black rounded px-1.5 py-0.5 text-sm sm:text-base tabular-nums ${
                score.isAdPlayer
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-yellow-400'
              }`}
            >
              {score.scoreDisplay.player}
            </div>
          </div>

          {/* AI Opponent Row */}
          <div className="flex items-center px-3 py-1.5 gap-2.5 bg-slate-950/90">
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              {isAiServer && <TennisBallIcon />}
            </div>

            <div className="flex items-center gap-1.5 w-24 sm:w-28">
              <span className="px-1 py-0.5 rounded bg-rose-600 text-white font-mono text-[9px] font-bold">
                CPU
              </span>
              <span className="font-bold text-slate-100 truncate text-xs sm:text-sm uppercase">
                {opponentName}
              </span>
            </div>

            {score.setHistory.map((s, idx) => (
              <div key={idx} className="w-5 text-center font-bold text-slate-400 text-xs tabular-nums">
                {s.ai}
              </div>
            ))}

            <div className="w-7 text-center font-black text-slate-200 text-sm sm:text-base tabular-nums">
              {score.aiGames}
            </div>

            <div
              className={`w-10 text-center font-black rounded px-1.5 py-0.5 text-sm sm:text-base tabular-nums ${
                score.isAdAi
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-yellow-400'
              }`}
            >
              {score.scoreDisplay.ai}
            </div>
          </div>
        </div>
      </div>

      {/* Power Charge Bar + Sub-Badges */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5 text-[10px] font-bold">
        {/* Power Shot Meter */}
        <div className="px-2 py-0.5 bg-slate-950/90 border border-slate-700/80 rounded-full flex items-center gap-1.5">
          <span className={powerCharge >= 100 ? 'text-orange-400 font-black' : 'text-slate-400'}>
            {powerCharge >= 100 ? 'SMASH READY' : 'POWER'}
          </span>
          <div className="w-14 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                powerCharge >= 100 ? 'bg-orange-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${powerCharge}%` }}
            />
          </div>
        </div>

        {score.servingFaultCount === 1 && (
          <div className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full">
            2ND SERVE
          </div>
        )}

        {score.isTiebreak && (
          <div className="px-2.5 py-0.5 bg-sky-500 text-slate-950 font-black rounded-full">
            TIE-BREAK
          </div>
        )}

        {stats.lastServeSpeedKmh > 0 && (
          <div className="px-2.5 py-0.5 bg-slate-950/90 border border-slate-700/80 text-yellow-300 rounded-full flex items-center gap-1">
            <span className="text-[9px] text-slate-400">SERVE</span>
            <span className="tabular-nums">{stats.lastServeSpeedKmh}</span>
            <span className="text-[9px] text-slate-400">km/h</span>
          </div>
        )}

        {stats.currentRally > 1 && (
          <div className="px-2.5 py-0.5 bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 rounded-full flex items-center gap-1">
            <span className="text-[9px] text-emerald-400">RALLY</span>
            <span className="tabular-nums">{stats.currentRally}</span>
          </div>
        )}

        {isDeuce && (
          <div className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full">
            DEUCE
          </div>
        )}

        {isBreakPoint && !isDeuce && (
          <div className="px-2.5 py-0.5 bg-rose-600 text-white font-bold rounded-full tracking-wide">
            BREAK POINT
          </div>
        )}
      </div>
    </div>
  );
};
