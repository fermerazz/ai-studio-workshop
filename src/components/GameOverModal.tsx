import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStatus, PieceColor, PlayerInfo } from '../types/chess';
import { Trophy, RotateCcw, Home, Handshake } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  status: GameStatus;
  winner: PieceColor | 'draw' | null;
  whitePlayer: PlayerInfo | null;
  blackPlayer: PlayerInfo | null;
  yourColor: PieceColor | null;
  rematchOffer: PieceColor | null;
  onOfferRematch: () => void;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  status,
  winner,
  whitePlayer,
  blackPlayer,
  yourColor,
  rematchOffer,
  onOfferRematch,
  onNewGame,
}) => {
  const isWinner = yourColor && winner === yourColor;
  const isDraw = winner === 'draw' || status === 'draw' || status === 'stalemate';

  // Fire celebratory confetti if you won or if it was an exciting decisive game
  useEffect(() => {
    if (isOpen && winner && winner !== 'draw') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#d97706', '#f59e0b', '#fbbf24', '#ffffff'],
        });
      } catch {}
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  let title = 'Game Concluded';
  let subtext = '';

  if (isDraw) {
    title = 'Peaceful Draw';
    if (status === 'stalemate') subtext = 'Drawn by Stalemate (no legal moves).';
    else subtext = 'Game ended in a draw.';
  } else if (winner === 'w') {
    title = `${whitePlayer ? whitePlayer.name : 'White'} Wins!`;
    if (status === 'checkmate') subtext = 'Victory by Checkmate.';
    else if (status === 'timeout') subtext = 'Victory on Time (Black ran out of clock).';
    else if (status === 'resigned') subtext = 'Victory by Resignation.';
  } else if (winner === 'b') {
    title = `${blackPlayer ? blackPlayer.name : 'Black'} Wins!`;
    if (status === 'checkmate') subtext = 'Victory by Checkmate.';
    else if (status === 'timeout') subtext = 'Victory on Time (White ran out of clock).';
    else if (status === 'resigned') subtext = 'Victory by Resignation.';
  }

  const hasOfferedRematch = yourColor && rematchOffer === yourColor;
  const opponentOfferedRematch = yourColor && rematchOffer && rematchOffer !== yourColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#181b20] border border-amber-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center text-slate-100">
        <div className="flex justify-center mb-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              isDraw
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isDraw ? <Handshake className="w-7 h-7" /> : <Trophy className="w-7 h-7" />}
          </div>
        </div>

        <h2 className="text-xl font-bold font-sans text-slate-100">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          {subtext}
        </p>

        {/* Players summary */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 mb-6 flex items-center justify-around text-xs">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-slate-200 truncate max-w-[100px]">
              {whitePlayer?.name || 'White'}
            </span>
            <span className="text-[10px] text-slate-500">
              {winner === 'w' ? 'Winner 1-0' : isDraw ? '1/2' : '0-1'}
            </span>
          </div>
          <span className="text-slate-600 font-bold">vs</span>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-slate-200 truncate max-w-[100px]">
              {blackPlayer?.name || 'Black'}
            </span>
            <span className="text-[10px] text-slate-500">
              {winner === 'b' ? 'Winner 0-1' : isDraw ? '1/2' : '1-0'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onOfferRematch}
            disabled={Boolean(hasOfferedRematch)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              opponentOfferedRematch
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : hasOfferedRematch
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {opponentOfferedRematch
                ? 'Accept Rematch!'
                : hasOfferedRematch
                ? 'Rematch Offered (Waiting...)'
                : 'Request Rematch'}
            </span>
          </button>

          <button
            onClick={onNewGame}
            className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
