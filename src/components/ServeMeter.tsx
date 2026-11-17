import React from 'react';

interface ServeMeterProps {
  meterValue: number; // 0 to 100
  visible: boolean;
}

export const ServeMeter: React.FC<ServeMeterProps> = ({ meterValue, visible }) => {
  if (!visible || meterValue <= 0) return null;

  const isSweetSpot = meterValue >= 75 && meterValue <= 95;

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-30 flex flex-col items-center">
      <div className="bg-slate-950/92 border border-slate-700/90 px-4 py-2 rounded-2xl shadow-2xl flex flex-col items-center gap-1.5">
        <div className="flex items-center justify-between w-48 text-[10px] font-bold text-slate-300">
          <span>SERVE TIMING</span>
          <span className={isSweetSpot ? 'text-emerald-400 font-extrabold' : 'text-yellow-400'}>
            {isSweetSpot ? 'SWEET SPOT!' : 'HIT AT PEAK'}
          </span>
        </div>

        {/* Gauge Bar */}
        <div className="relative w-48 h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
          <div className="absolute top-0 bottom-0 left-[75%] right-[5%] bg-emerald-500/40 border-x border-emerald-400" />
          <div
            className={`h-full transition-all duration-75 rounded-full ${
              isSweetSpot
                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                : 'bg-gradient-to-r from-blue-500 to-yellow-400'
            }`}
            style={{ width: `${meterValue}%` }}
          />
        </div>

        <span className="text-[10px] text-slate-400 font-medium">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">SPACE</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">SERVE</kbd>
        </span>
      </div>
    </div>
  );
};
