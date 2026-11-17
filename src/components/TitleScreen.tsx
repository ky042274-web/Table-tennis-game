import React, { useState, useEffect } from 'react';
import { GameSettings, DifficultyLevel, GameMode, CourtSurface } from '../types/tennis';
import { COURT_SURFACES, PLAYABLE_CHARACTERS } from '../game/constants';
import { tennisAudio } from '../audio/tennisAudio';
import { Play, HelpCircle, Settings as SettingsIcon, Volume2, VolumeX, Trophy, X, Award, Target } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  trophiesWon: number;
  bestPracticeStreak: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  settings,
  onUpdateSettings,
  trophiesWon,
  bestPracticeStreak,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Enter key starts match directly from Title Screen when modals are closed
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showInstructions || showSettings) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        tennisAudio.playMenuClick();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showInstructions, showSettings, onStartGame]);

  const modes: Array<{ id: GameMode; label: string; sub: string }> = [
    { id: 'quick', label: 'QUICK MATCH', sub: '1v1 Exhibition' },
    { id: 'tournament', label: 'CHAMPION CUP', sub: '3-Round Trophy' },
    { id: 'practice', label: 'PRACTICE', sub: 'Target Rally' },
  ];

  const surfaces: Array<{ id: CourtSurface; label: string; dotClass: string }> = [
    { id: 'grass', label: 'Grass', dotClass: 'bg-emerald-500' },
    { id: 'clay', label: 'Clay', dotClass: 'bg-orange-500' },
    { id: 'hard', label: 'Hard', dotClass: 'bg-sky-500' },
    { id: 'night', label: 'Night', dotClass: 'bg-cyan-400' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-b from-slate-950/65 via-transparent to-slate-950/85">
      {/* Top Header Bar */}
      <div className="w-full flex justify-between items-center max-w-5xl pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-xs font-bold text-emerald-400">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>CHAMPIONSHIP TOUR</span>
          </div>
          {trophiesWon > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-xs font-bold text-amber-300 tabular-nums">
              <Award className="w-3.5 h-3.5" />
              <span>{trophiesWon} {trophiesWon === 1 ? 'Trophy' : 'Trophies'}</span>
            </div>
          )}
          {bestPracticeStreak > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-xs font-bold text-sky-300 tabular-nums">
              <Target className="w-3.5 h-3.5" />
              <span>Best Rally: {bestPracticeStreak}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              tennisAudio.playMenuClick();
              setShowInstructions(true);
            }}
            className="px-3 py-2 rounded-full bg-slate-950/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">HOW TO PLAY</span>
          </button>

          <button
            onClick={() => {
              tennisAudio.playMenuClick();
              setShowSettings(true);
            }}
            className="px-3 py-2 rounded-full bg-slate-950/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <SettingsIcon className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">SETTINGS</span>
          </button>

          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className="p-2 rounded-full bg-slate-950/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow active:scale-95"
            title={settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-rose-400" />
            )}
          </button>
        </div>
      </div>

      {/* Hero Title Lockup (Compact to leave 3D Stadium visible!) */}
      <div className="flex flex-col items-center pointer-events-auto my-auto text-center max-w-2xl w-full">
        <div className="mb-2 flex items-center justify-center">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_10px_20px_rgba(34,197,94,0.4)]" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="42" r="30" stroke="#facc15" strokeWidth="5" />
            <line x1="32" y1="30" x2="68" y2="30" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="24" y1="42" x2="76" y2="42" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="32" y1="54" x2="68" y2="54" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="38" y1="20" x2="38" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="50" y1="16" x2="50" y2="68" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="62" y1="20" x2="62" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="50" y1="72" x2="50" y2="94" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
            <circle cx="68" cy="30" r="14" fill="#ccff00" stroke="#ffffff" strokeWidth="2" />
            <path d="M 60 22 Q 68 30 60 38" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M 76 22 Q 68 30 76 38" stroke="#ffffff" strokeWidth="2" fill="none" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          TENNIS <span className="text-emerald-400">ARENA</span> 3D
        </h1>

        {/* Quick Setup Panel */}
        <div className="mt-4 w-full bg-slate-950/90 border border-slate-700/90 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  tennisAudio.playMenuClick();
                  onUpdateSettings({ mode: m.id });
                }}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  settings.mode === m.id
                    ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="block text-[11px] sm:text-xs font-black tracking-wide">{m.label}</span>
                <span className={`block text-[9px] font-semibold ${settings.mode === m.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {m.sub}
                </span>
              </button>
            ))}
          </div>

          {/* Court Surface + Character Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Court Surface Picker */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                COURT: {COURT_SURFACES[settings.surface].name}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {surfaces.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      tennisAudio.playMenuClick();
                      onUpdateSettings({ surface: s.id });
                    }}
                    className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                      settings.surface === s.id
                        ? 'bg-slate-800 border-emerald-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${s.dotClass}`} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Player Character Picker */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                PLAYER STAR
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {PLAYABLE_CHARACTERS.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      tennisAudio.playMenuClick();
                      onUpdateSettings({ characterId: char.id });
                    }}
                    className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all ${
                      settings.characterId === char.id
                        ? 'bg-slate-800 border-yellow-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: char.accentHex }}
                    />
                    <span>{char.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Play CTA */}
        <button
          onClick={() => {
            tennisAudio.playMenuClick();
            onStartGame();
          }}
          className="mt-5 w-64 px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-lg tracking-wider uppercase shadow-[0_0_28px_rgba(34,197,94,0.55)] active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-emerald-200"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>
            {settings.mode === 'tournament'
              ? 'START CUP'
              : settings.mode === 'practice'
              ? 'START PRACTICE'
              : 'PLAY MATCH'}
          </span>
        </button>
      </div>

      {/* Control Hint Line */}
      <div className="pointer-events-none text-center">
        <div className="text-[11px] sm:text-xs font-medium text-slate-300 bg-slate-950/85 border border-slate-800 px-4 py-1.5 rounded-full">
          WASD Move · Space Drive/Serve · E Slice · Q Lob · P Pause
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="absolute inset-0 bg-slate-950/85 pointer-events-auto flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-emerald-400 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span>HOW TO PLAY</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="font-bold text-white block mb-1">SERVING</span>
                Move left/right along the baseline to aim your blue serve target. Press <kbd className="px-1 bg-slate-700 rounded font-mono text-yellow-400">SPACE</kbd> or <kbd className="px-1 bg-slate-700 rounded font-mono text-yellow-400">ENTER</kbd> to toss, then press again in the green sweet spot for a blazing ACE!
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="font-bold text-white block mb-1">SHOT ARSENAL</span>
                <ul className="space-y-1">
                  <li><kbd className="px-1 bg-slate-700 rounded font-mono text-emerald-400">SPACE</kbd> — Topspin Drive (or <strong>SMASH!</strong> when high / Power 100%)</li>
                  <li><kbd className="px-1 bg-slate-700 rounded font-mono text-sky-400">E</kbd> / <kbd className="px-1 bg-slate-700 rounded font-mono text-sky-400">SHIFT</kbd> — Low Slice / Drop Shot</li>
                  <li><kbd className="px-1 bg-slate-700 rounded font-mono text-violet-400">Q</kbd> — High Lob over opponent</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="font-bold text-white block mb-1">AIMING & MOVEMENT</span>
                Use <kbd className="px-1 bg-slate-700 rounded font-mono text-yellow-400">WASD</kbd> / Arrow keys (or the Touch Joystick) to move and steer shots Left/Right, Deep (<kbd className="px-1 bg-slate-700 rounded font-mono">W</kbd>), or Drop (<kbd className="px-1 bg-slate-700 rounded font-mono">S</kbd>). Watch the yellow landing ring to read the bounce!
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="font-bold text-white block mb-1">REAL TENNIS RULES</span>
                0 → 15 → 30 → 40 → Game, Deuce/Advantage, 7-point Tie-Breaks, Let calls, Second Serves, and Hawk-Eye close line calls!
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-slate-950/85 pointer-events-auto flex items-center justify-center p-4 z-40">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-yellow-400 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              <span>MATCH SETTINGS</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-200 block mb-2">AI OPPONENT DIFFICULTY</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => onUpdateSettings({ difficulty: level })}
                      className={`py-2 rounded-xl font-bold uppercase transition-all ${
                        settings.difficulty === level
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-2">GAMES PER SET</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 1, label: '1 Game' },
                    { count: 3, label: '3 Games' },
                    { count: 6, label: '6 Games' },
                  ].map((item) => (
                    <button
                      key={item.count}
                      onClick={() => onUpdateSettings({ gamesToWinSet: item.count })}
                      className={`py-2 rounded-xl font-bold transition-all text-[11px] ${
                        settings.gamesToWinSet === item.count
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-2">MATCH FORMAT</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { count: 1, label: '1 Set Match' },
                    { count: 2, label: 'Best of 3 Sets' },
                  ].map((item) => (
                    <button
                      key={item.count}
                      onClick={() => onUpdateSettings({ setsToWinMatch: item.count })}
                      className={`py-2 rounded-xl font-bold transition-all text-[11px] ${
                        settings.setsToWinMatch === item.count
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="font-bold text-slate-200 block">Easy Auto-Position Assist</span>
                  <span className="text-[10px] text-slate-400">Gently helps guide your player toward incoming balls</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAssist}
                  onChange={(e) => onUpdateSettings({ autoAssist: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="font-bold text-slate-200 block">Dynamic Broadcast Camera</span>
                  <span className="text-[10px] text-slate-400">Camera gently tracks rallies and deep shots</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cameraDynamic}
                  onChange={(e) => onUpdateSettings({ cameraDynamic: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div>
                  <span className="font-bold text-slate-200 block">Sound & Crowd Effects</span>
                  <span className="text-[10px] text-slate-400">Audio for hits, bounces, line calls & cheers</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm tracking-wide transition-all"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
