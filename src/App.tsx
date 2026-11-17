import React, { useEffect, useRef, useState } from 'react';
import { TennisGameEngine } from './game/TennisGameEngine';
import { PLAYABLE_CHARACTERS, TOURNAMENT_OPPONENTS } from './game/constants';
import {
  GameState,
  ScoreState,
  MatchStats,
  GameSettings,
  PointAnnouncement,
  TournamentProgress,
} from './types/tennis';
import { Scoreboard } from './components/Scoreboard';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { ServeMeter } from './components/ServeMeter';
import { OnScreenControls } from './components/OnScreenControls';
import { TitleScreen } from './components/TitleScreen';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { PauseModal } from './components/PauseModal';
import { Pause, Volume2, VolumeX, RotateCcw, Home } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TennisGameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState<ScoreState>({
    playerPoints: 0,
    aiPoints: 0,
    playerGames: 0,
    aiGames: 0,
    playerSets: 0,
    aiSets: 0,
    setHistory: [],
    isTiebreak: false,
    currentServer: 'player',
    serveSide: 'deuce',
    isDeuce: false,
    isAdPlayer: false,
    isAdAi: false,
    scoreDisplay: { player: '0', ai: '0' },
    servingFaultCount: 0,
  });

  const [stats, setStats] = useState<MatchStats>({
    acesPlayer: 0,
    acesAi: 0,
    winnersPlayer: 0,
    winnersAi: 0,
    unforcedErrorsPlayer: 0,
    unforcedErrorsAi: 0,
    powerShotsPlayer: 0,
    totalPointsPlayer: 0,
    totalPointsAi: 0,
    maxRally: 0,
    currentRally: 0,
    lastServeSpeedKmh: 0,
    fastestServeKmh: 0,
    practiceScore: 0,
    practiceBestStreak: 0,
  });

  const [tournament, setTournament] = useState<TournamentProgress>({
    round: 1,
    roundName: TOURNAMENT_OPPONENTS[0].roundName,
    opponentName: TOURNAMENT_OPPONENTS[0].character.name,
    wonTournament: false,
  });

  const [announcement, setAnnouncement] = useState<PointAnnouncement | null>(null);
  const [serveMeter, setServeMeter] = useState<number>(0);
  const [powerCharge, setPowerCharge] = useState<number>(0);

  const [trophiesWon, setTrophiesWon] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('ta3d_trophies') || '0');
    } catch {
      return 0;
    }
  });

  const [bestPracticeStreak, setBestPracticeStreak] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('ta3d_best_rally') || '0');
    } catch {
      return 0;
    }
  });

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'quick',
    surface: 'grass',
    difficulty: 'medium',
    gamesToWinSet: 3,
    setsToWinMatch: 1,
    characterId: 'alex',
    soundEnabled: true,
    soundVolume: 0.7,
    cameraDynamic: true,
    autoAssist: true,
  });

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new TennisGameEngine(mountRef.current);
    engineRef.current = engine;

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    engine.onScoreUpdate = (newScore) => {
      setScore(newScore);
    };

    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
      if (newStats.practiceBestStreak > 0) {
        setBestPracticeStreak((prev) => {
          const next = Math.max(prev, newStats.practiceBestStreak);
          try {
            localStorage.setItem('ta3d_best_rally', String(next));
          } catch {
            // ignore storage errors
          }
          return next;
        });
      }
    };

    engine.onAnnouncement = (ann) => {
      setAnnouncement(ann);
      setTimeout(() => {
        setAnnouncement((curr) => (curr?.time === ann.time ? null : curr));
      }, 2000);
    };

    engine.onServeMeterUpdate = (meter) => {
      setServeMeter(meter);
    };

    engine.onPowerChargeUpdate = (charge) => {
      setPowerCharge(charge);
    };

    engine.onTournamentUpdate = (t) => {
      setTournament(t);
      if (t.wonTournament) {
        setTrophiesWon((prev) => {
          const next = prev + 1;
          try {
            localStorage.setItem('ta3d_trophies', String(next));
          } catch {
            // ignore storage errors
          }
          return next;
        });
      }
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.startMatch(true);
    }
  };

  const handleRestartGame = () => {
    if (engineRef.current) {
      if (settings.mode === 'tournament' && tournament.wonTournament) {
        engineRef.current.startMatch(true);
      } else {
        engineRef.current.restartMatch();
      }
    }
  };

  const handleNextTournamentRound = () => {
    if (engineRef.current) {
      engineRef.current.advanceTournamentRound();
    }
  };

  const handleResumeGame = () => {
    if (engineRef.current && gameState === 'paused') {
      engineRef.current.togglePause();
    }
  };

  const handleReturnToMenu = () => {
    if (engineRef.current) {
      engineRef.current.ai.cancelServe();
      engineRef.current.state = 'menu';
      setGameState('menu');
      engineRef.current.onStateChange?.('menu');
    }
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (engineRef.current) {
      if (newSettings.mode) engineRef.current.settings.mode = newSettings.mode;
      if (newSettings.surface) engineRef.current.applySurface(newSettings.surface);
      if (newSettings.characterId) engineRef.current.applyCharacter(newSettings.characterId);
      if (newSettings.difficulty) engineRef.current.setDifficulty(newSettings.difficulty);
      if (newSettings.gamesToWinSet !== undefined) engineRef.current.setGamesToWin(newSettings.gamesToWinSet);
      if (newSettings.setsToWinMatch !== undefined) engineRef.current.setSetsToWin(newSettings.setsToWinMatch);
      if (newSettings.soundEnabled !== undefined) engineRef.current.setSoundMuted(!newSettings.soundEnabled);
      if (newSettings.cameraDynamic !== undefined) engineRef.current.settings.cameraDynamic = newSettings.cameraDynamic;
      if (newSettings.autoAssist !== undefined) engineRef.current.settings.autoAssist = newSettings.autoAssist;
    }
  };

  const handleToggleSound = () => {
    handleUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const playerChar = PLAYABLE_CHARACTERS.find((c) => c.id === settings.characterId) || PLAYABLE_CHARACTERS[0];
  const opponentDisplayName =
    settings.mode === 'tournament' ? tournament.opponentName : 'CPU';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 touch-none w-full h-full"
      />

      {/* Top Floating Broadcast Header */}
      {gameState !== 'menu' && (
        <div className="absolute top-0 inset-x-0 p-3 sm:p-4 z-20 flex justify-between items-start pointer-events-none">
          {/* Quick Left Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-full bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-lg active:scale-95 transition-all"
              title={settings.soundEnabled ? 'Mute' : 'Unmute'}
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-rose-400" />
              )}
            </button>

            {settings.mode === 'practice' && (
              <button
                onClick={handleReturnToMenu}
                className="p-2 rounded-full bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-lg active:scale-95 transition-all"
                title="Exit Practice to Menu"
              >
                <Home className="w-5 h-5 text-sky-400" />
              </button>
            )}
          </div>

          {/* Center Broadcast Scoreboard */}
          <div className="pointer-events-auto">
            <Scoreboard
              score={score}
              stats={stats}
              powerCharge={powerCharge}
              mode={settings.mode}
              playerName={playerChar.name}
              opponentName={opponentDisplayName}
              tournament={tournament}
            />
          </div>

          {/* Quick Controls: Restart & Pause */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={handleRestartGame}
              className="p-2 rounded-full bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-lg active:scale-95 transition-all"
              title="Restart Match"
            >
              <RotateCcw className="w-5 h-5 text-amber-400" />
            </button>

            <button
              onClick={() => engineRef.current?.togglePause()}
              className="p-2 rounded-full bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-lg active:scale-95 transition-all"
              title="Pause Game (P)"
            >
              <Pause className="w-5 h-5 text-sky-400" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Announcement Overlay */}
      <AnnouncementBanner announcement={announcement} />

      {/* Serve Power / Timing Meter */}
      <ServeMeter
        meterValue={serveMeter}
        visible={gameState === 'serving' && score.currentServer === 'player'}
      />

      {/* Touch & On-Screen Controls */}
      <OnScreenControls
        gameState={gameState}
        isPlayerServer={score.currentServer === 'player'}
        powerReady={powerCharge >= 100}
        onSwing={() => engineRef.current?.handleSpaceAction()}
        onSlice={() => engineRef.current?.handleSliceAction()}
        onLob={() => engineRef.current?.handleLobAction()}
        onServe={() => engineRef.current?.handleEnterAction()}
        onJoystickMove={(vec) => {
          if (engineRef.current) {
            engineRef.current.joystickVector = vec;
          }
        }}
      />

      {/* Title Screen Overlay */}
      {gameState === 'menu' && (
        <TitleScreen
          onStartGame={handleStartGame}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          trophiesWon={trophiesWon}
          bestPracticeStreak={bestPracticeStreak}
        />
      )}

      {/* Pause Modal Overlay */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResumeGame}
          onRestart={handleRestartGame}
          onMainMenu={handleReturnToMenu}
          settings={settings}
          onToggleSound={handleToggleSound}
          onToggleAutoAssist={() => handleUpdateSettings({ autoAssist: !settings.autoAssist })}
        />
      )}

      {/* Match Summary / Victory Screen Overlay */}
      {gameState === 'game_over' && (
        <MatchSummaryModal
          score={score}
          stats={stats}
          mode={settings.mode}
          tournament={tournament}
          onRematch={handleRestartGame}
          onNextRound={handleNextTournamentRound}
          onMainMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}
