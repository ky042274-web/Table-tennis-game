import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { GameSettings } from '../types/tennis';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  settings: GameSettings;
  onToggleSound: () => void;
  onToggleAutoAssist: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMainMenu,
  settings,
  onToggleSound,
  onToggleAutoAssist,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 pointer-events-auto flex items-center justify-center p-4 z-40 select-none">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl flex flex-col items-center">
        <h3 className="text-2xl font-black tracking-wider uppercase mb-1 text-slate-100">MATCH PAUSED</h3>
        <p className="text-xs text-slate-400 font-semibold mb-5">Take a breath, champion</p>

        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm tracking-wide transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART MATCH</span>
          </button>

          <button
            onClick={onToggleAutoAssist}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wide transition-all border border-slate-700/80 flex items-center justify-between px-4"
          >
            <span>AUTO-POSITION ASSIST</span>
            <span className={settings.autoAssist ? 'text-emerald-400 font-black' : 'text-slate-500'}>
              {settings.autoAssist ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={onToggleSound}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wide transition-all border border-slate-700/80 flex items-center justify-center gap-2"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            <span>{settings.soundEnabled ? 'MUTE SOUND' : 'UNMUTE SOUND'}</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs tracking-wide transition-all mt-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
