import React, { useState } from 'react';
import { TimeControl } from '../types/chess';
import { Clock, Shield, Sparkles, Swords, User } from 'lucide-react';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGame: (config: {
    playerName: string;
    preferredColor: 'w' | 'b' | 'random';
    timeControl: TimeControl;
  }) => void;
  defaultPlayerName: string;
}

const PRESET_TIME_CONTROLS: Array<{
  name: string;
  desc: string;
  initialMinutes: number;
  incrementSeconds: number;
}> = [
  { name: '10 min', desc: 'Rapid (Standard)', initialMinutes: 10, incrementSeconds: 0 },
  { name: '5 min', desc: 'Blitz', initialMinutes: 5, incrementSeconds: 0 },
  { name: '3 min', desc: 'Fast Blitz', initialMinutes: 3, incrementSeconds: 0 },
  { name: '15 | 10', desc: 'Classical + Increment', initialMinutes: 15, incrementSeconds: 10 },
  { name: 'Unlimited', desc: 'Casual (No Timer)', initialMinutes: 0, incrementSeconds: 0 },
];

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
  onCreateGame,
  defaultPlayerName,
}) => {
  const [playerName, setPlayerName] = useState(defaultPlayerName || 'Grandmaster');
  const [selectedTimeControlIndex, setSelectedTimeControlIndex] = useState(0);
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('w');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tc = PRESET_TIME_CONTROLS[selectedTimeControlIndex];
    onCreateGame({
      playerName: playerName.trim() || 'Player 1',
      preferredColor,
      timeControl: {
        initialMinutes: tc.initialMinutes,
        incrementSeconds: tc.incrementSeconds,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#181b20] border border-slate-700/80 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-sans">
              Create a Chess Match
            </h2>
            <p className="text-xs text-slate-400">
              Host a room and invite a friend in real time
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Your Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Your Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Time Control
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESET_TIME_CONTROLS.map((tc, idx) => {
                const isSelected = selectedTimeControlIndex === idx;
                return (
                  <button
                    key={tc.name}
                    type="button"
                    onClick={() => setSelectedTimeControlIndex(idx)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-100">
                      {tc.name}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {tc.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Choose Your Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Play As
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreferredColor('w')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  preferredColor === 'w'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300" />
                <span>White</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredColor('random')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  preferredColor === 'random'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Random</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredColor('b')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  preferredColor === 'b'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600" />
                <span>Black</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Create Room & Get Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
