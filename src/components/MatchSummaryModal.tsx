import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ScoreState, MatchStats, GameMode, TournamentProgress } from '../types/tennis';
import { Trophy, RotateCcw, Home, Zap, Award, Flame, ArrowRight } from 'lucide-react';

interface MatchSummaryModalProps {
  score: ScoreState;
  stats: MatchStats;
  mode: GameMode;
  tournament: TournamentProgress;
  onRematch: () => void;
  onNextRound: () => void;
  onMainMenu: () => void;
}

export const MatchSummaryModal: React.FC<MatchSummaryModalProps> = ({
  score,
  stats,
  mode,
  tournament,
  onRematch,
  onNextRound,
  onMainMenu,
}) => {
  const isPlayerWinner = score.playerSets > score.aiSets || (score.playerSets === score.aiSets && score.playerGames > score.aiGames);
  const canAdvanceTournament = mode === 'tournament' && isPlayerWinner && tournament.round < 3;
  const isGrandChampion = mode === 'tournament' && isPlayerWinner && tournament.round === 3;

  useEffect(() => {
    if (isPlayerWinner) {
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#22c55e', '#3b82f6', '#facc15', '#ec4899'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isPlayerWinner]);

  return (
    <div className="absolute inset-0 bg-slate-950/88 pointer-events-auto flex items-center justify-center p-4 z-40 select-none">
      <div className="bg-slate-900 border-2 border-slate-700/90 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative flex flex-col items-center">
        {/* Trophy / Result Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-2xl border-2 ${
            isPlayerWinner
              ? 'bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 border-yellow-200'
              : 'bg-slate-800 text-slate-400 border-slate-600'
          }`}
        >
          <Trophy className="w-10 h-10 fill-current" />
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center">
          {isGrandChampion ? (
            <span className="text-yellow-300">CHAMPIONSHIP WON!</span>
          ) : isPlayerWinner ? (
            <span className="text-emerald-400">MATCH VICTORY!</span>
          ) : (
            <span className="text-rose-400">MATCH DEFEAT</span>
          )}
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 font-semibold tracking-wide uppercase mt-1 mb-5">
          {mode === 'tournament'
            ? isGrandChampion
              ? 'YOU LIFTED THE ARENA GRAND SLAM TROPHY!'
              : isPlayerWinner
              ? `${tournament.roundName} CLEARED`
              : `ELIMINATED IN ${tournament.roundName}`
            : isPlayerWinner
            ? 'TENNIS ARENA WINNER'
            : 'GOOD MATCH! TRY AGAIN'}
        </p>

        {/* Set Scores Display */}
        <div className="flex items-center justify-center gap-4 bg-slate-950/90 border border-slate-800 rounded-2xl px-6 py-3 mb-5 w-full">
          {score.setHistory.length > 0 ? (
            score.setHistory.map((s, i) => (
              <div key={i} className="text-center px-3 border-r last:border-r-0 border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">SET {i + 1}</span>
                <span className="text-2xl font-black text-white tabular-nums">
                  <span className="text-blue-400">{s.player}</span>
                  <span className="text-slate-600 mx-1">-</span>
                  <span className="text-rose-400">{s.ai}</span>
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="text-center">
                <span className="text-[10px] font-bold text-blue-400 block uppercase">YOU</span>
                <span className="text-3xl font-black text-white tabular-nums">{score.playerGames}</span>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="text-center">
                <span className="text-[10px] font-bold text-rose-400 block uppercase">CPU</span>
                <span className="text-3xl font-black text-white tabular-nums">{score.aiGames}</span>
              </div>
            </>
          )}
        </div>

        {/* Match Statistics Grid */}
        <div className="w-full grid grid-cols-2 gap-2 text-xs mb-6">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" /> Aces
            </span>
            <div className="flex justify-between items-baseline mt-1 font-mono font-bold tabular-nums">
              <span className="text-blue-400">{stats.acesPlayer}</span>
              <span className="text-slate-500 font-normal text-[10px]">vs</span>
              <span className="text-rose-400">{stats.acesAi}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-400" /> Winners
            </span>
            <div className="flex justify-between items-baseline mt-1 font-mono font-bold tabular-nums">
              <span className="text-blue-400">{stats.winnersPlayer}</span>
              <span className="text-slate-500 font-normal text-[10px]">vs</span>
              <span className="text-rose-400">{stats.winnersAi}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" /> Power Smashes
            </span>
            <span className="text-orange-300 font-bold mt-1 font-mono tabular-nums">
              {stats.powerShotsPlayer} hits
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Fastest Serve</span>
            <span className="text-amber-400 font-bold mt-1 font-mono tabular-nums">
              {stats.fastestServeKmh > 0 ? `${stats.fastestServeKmh} km/h` : '—'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {canAdvanceTournament ? (
            <button
              onClick={onNextRound}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wider uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <span>NEXT ROUND</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRematch}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm tracking-wider uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{mode === 'tournament' && isGrandChampion ? 'NEW CUP' : 'PLAY AGAIN'}</span>
            </button>
          )}

          <button
            onClick={onMainMenu}
            className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm tracking-wide transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
