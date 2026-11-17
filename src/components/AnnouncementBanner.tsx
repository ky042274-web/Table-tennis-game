import React from 'react';
import { PointAnnouncement } from '../types/tennis';

interface AnnouncementBannerProps {
  announcement: PointAnnouncement | null;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcement }) => {
  if (!announcement) return null;

  const isPositive =
    announcement.type === 'ace' ||
    announcement.type === 'winner' ||
    announcement.type === 'game' ||
    announcement.type === 'set' ||
    announcement.type === 'match';
  const isSmash = announcement.type === 'smash';
  const isNegative =
    announcement.type === 'fault' ||
    announcement.type === 'double_fault' ||
    announcement.type === 'out' ||
    announcement.type === 'net';

  let bgClasses = 'bg-slate-900/95 border-slate-600 text-white';
  if (isSmash) {
    bgClasses = 'bg-gradient-to-r from-orange-600 to-amber-500 border-yellow-300 text-slate-950 shadow-2xl';
  } else if (isPositive) {
    bgClasses = 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-300 text-white shadow-2xl';
  } else if (isNegative) {
    bgClasses = 'bg-gradient-to-r from-rose-600 to-red-600 border-rose-300 text-white shadow-2xl';
  }

  return (
    <div className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none select-none z-30 flex flex-col items-center gap-1.5">
      <div className={`px-6 py-2 rounded-xl border-2 flex flex-col items-center ${bgClasses}`}>
        <span className="text-lg sm:text-2xl font-black tracking-wider uppercase">
          {announcement.title}
        </span>
        {announcement.subtitle && (
          <span className="text-[11px] sm:text-xs font-bold opacity-95 tracking-wide">
            {announcement.subtitle}
          </span>
        )}
      </div>

      {/* Hawk-Eye Electronic Line Call Chip */}
      {announcement.lineCall && (
        <div
          className={`px-3 py-1 rounded-lg border text-[11px] font-black tracking-wider uppercase shadow-lg flex items-center gap-2 ${
            announcement.lineCall.isIn
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
              : 'bg-rose-950/95 border-rose-400 text-rose-300'
          }`}
        >
          <span>HAWK-EYE: {announcement.lineCall.isIn ? 'IN' : 'OUT'}</span>
          <span className="text-white/80 font-mono tabular-nums">
            {announcement.lineCall.distanceCm} cm ({announcement.lineCall.lineName})
          </span>
        </div>
      )}
    </div>
  );
};
