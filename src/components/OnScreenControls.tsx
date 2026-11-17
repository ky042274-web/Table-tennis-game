import React, { useRef, useState, useEffect } from 'react';
import { GameState } from '../types/tennis';

interface OnScreenControlsProps {
  gameState: GameState;
  isPlayerServer: boolean;
  powerReady: boolean;
  onSwing: () => void;
  onSlice: () => void;
  onLob: () => void;
  onServe: () => void;
  onJoystickMove: (vector: { x: number; y: number }) => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({
  gameState,
  isPlayerServer,
  powerReady,
  onSwing,
  onSlice,
  onLob,
  onServe,
  onJoystickMove,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateJoystick(e);
  };

  const updateJoystick = (e: React.PointerEvent | PointerEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const maxRadius = rect.width / 2 - 12;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: clampedX, y: clampedY });

    onJoystickMove({
      x: clampedX / maxRadius,
      y: clampedY / maxRadius,
    });
  };

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (isDragging) {
        updateJoystick(e);
      }
    };
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onJoystickMove({ x: 0, y: 0 });
      }
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [isDragging, onJoystickMove]);

  if (gameState === 'menu' || gameState === 'game_over') return null;

  const showServeAction = gameState === 'serving' && isPlayerServer;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      <div />

      {/* Bottom Controls Area */}
      <div className="flex items-end justify-between w-full">
        {/* Virtual Analog Joystick (Left Side) */}
        <div className="pointer-events-auto">
          <div
            ref={joystickRef}
            onPointerDown={handlePointerDown}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/70 border-2 border-slate-600/70 relative touch-none shadow-2xl flex items-center justify-center"
          >
            <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-slate-500/70" />
            <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-slate-500/70" />
            <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-slate-500/70" />
            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-slate-500/70" />

            <div className="w-14 h-14 rounded-full border border-slate-700/60" />

            <div
              className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg border-2 border-white/80 transition-transform duration-75 flex items-center justify-center"
              style={{
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white/60" />
            </div>
          </div>
          <span className="block text-center text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-wider">
            MOVE / AIM
          </span>
        </div>

        {/* Center Desktop Control Hint */}
        <div className="hidden md:flex flex-col items-center pb-2 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-slate-950/85 border border-slate-700/80 text-slate-300 text-[11px] font-medium tracking-wide flex items-center gap-2.5">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-yellow-400">WASD</kbd> Move
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-yellow-400">SPACE</kbd> Drive/Serve
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-sky-400">E</kbd> Slice
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-violet-400">Q</kbd> Lob
            </span>
          </div>
        </div>

        {/* Action Buttons (Right Side) */}
        <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-3">
          {gameState === 'rally' && (
            <>
              <button
                onClick={onLob}
                className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-slate-950/85 border-2 border-violet-400 text-violet-300 shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center font-bold text-[11px]"
              >
                <span>LOB</span>
                <span className="text-[8px] text-slate-400 font-mono">Q</span>
              </button>
              <button
                onClick={onSlice}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-950/85 border-2 border-sky-400 text-sky-300 shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center font-bold text-xs"
              >
                <span>SLICE</span>
                <span className="text-[8px] text-slate-400 font-mono">E</span>
              </button>
            </>
          )}

          {/* Primary Action Button */}
          <button
            onClick={showServeAction ? onServe : onSwing}
            className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 text-white shadow-2xl active:scale-90 transition-all flex flex-col items-center justify-center font-black ${
              showServeAction
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 border-amber-200 text-slate-950'
                : powerReady
                ? 'bg-gradient-to-tr from-orange-600 to-amber-500 border-yellow-200'
                : 'bg-gradient-to-tr from-emerald-600 to-green-500 border-emerald-300'
            }`}
          >
            <span className="text-sm sm:text-base tracking-wide">
              {showServeAction ? 'SERVE' : powerReady ? 'SMASH!' : 'DRIVE'}
            </span>
            <span className="text-[9px] opacity-85 font-mono font-semibold">
              {showServeAction ? 'TOSS / HIT' : 'SPACE'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
