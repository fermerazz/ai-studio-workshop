import React from 'react';
import { PlayerInfo, PieceColor } from '../types/chess';
import { User, WifiOff } from 'lucide-react';

interface ChessClockProps {
  player: PlayerInfo | null;
  color: PieceColor;
  isActive: boolean;
  timeLeftMs: number;
  label?: string;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  player,
  color,
  isActive,
  timeLeftMs,
  label,
}) => {
  const isWhite = color === 'w';

  // Format time: MM:SS, or SS.s if under 10 seconds
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((Math.max(0, timeLeftMs) % 1000) / 100);

  const isLowTime = totalSeconds < 30 && timeLeftMs > 0;
  const isCriticalTime = totalSeconds < 10 && timeLeftMs > 0;

  let timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  if (isCriticalTime) {
    timeString = `${seconds}.${tenths}`;
  }

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200 ${
        isActive
          ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
          : 'bg-[#181b20] border-slate-800/80 text-slate-400'
      }`}
    >
      {/* Player info */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-4 h-4 rounded-full border shrink-0 ${
            isWhite
              ? 'bg-[#f8f6f0] border-slate-300 shadow-sm'
              : 'bg-[#222834] border-slate-600 shadow-sm'
          }`}
          title={isWhite ? 'White' : 'Black'}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-100 truncate max-w-[140px] md:max-w-[180px]">
              {player ? player.name : label || (isWhite ? 'White' : 'Black')}
            </span>
            {player && !player.connected && (
              <span title="Disconnected" className="text-rose-400 flex items-center">
                <WifiOff className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {isWhite ? 'White' : 'Black'}
          </span>
        </div>
      </div>

      {/* Digital clock display */}
      <div
        className={`font-mono text-xl md:text-2xl font-bold tabular-nums tracking-wider px-3 py-1 rounded-lg border transition-colors ${
          isCriticalTime && isActive
            ? 'bg-rose-950/70 text-rose-400 border-rose-500/60 animate-pulse'
            : isLowTime && isActive
            ? 'bg-amber-950/50 text-amber-300 border-amber-600/50'
            : isActive
            ? 'bg-slate-900/90 text-amber-200 border-amber-500/40'
            : 'bg-slate-900/40 text-slate-400 border-slate-800'
        }`}
      >
        {timeString}
      </div>
    </div>
  );
};
