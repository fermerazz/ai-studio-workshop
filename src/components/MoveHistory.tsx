import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../types/chess';
import { Copy, Check, Download, History } from 'lucide-react';

interface MoveHistoryProps {
  history: MoveRecord[];
  currentMoveIndex?: number;
  onSelectMove?: (index: number) => void;
  fen: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentMoveIndex,
  onSelectMove,
  fen,
}) => {
  const [copiedFEN, setCopiedFEN] = React.useState(false);
  const [copiedPGN, setCopiedPGN] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new move arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  // Group moves into pairs (White & Black)
  const movePairs: Array<{
    moveNumber: number;
    white: MoveRecord;
    whiteIndex: number;
    black?: MoveRecord;
    blackIndex?: number;
  }> = [];

  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      whiteIndex: i,
      black: history[i + 1],
      blackIndex: i + 1,
    });
  }

  const generatePGN = () => {
    let pgn = '';
    movePairs.forEach((pair) => {
      pgn += `${pair.moveNumber}. ${pair.white.san} `;
      if (pair.black) {
        pgn += `${pair.black.san} `;
      }
    });
    return pgn.trim();
  };

  const handleCopyFEN = () => {
    navigator.clipboard.writeText(fen);
    setCopiedFEN(true);
    setTimeout(() => setCopiedFEN(false), 2000);
  };

  const handleCopyPGN = () => {
    const pgn = generatePGN();
    navigator.clipboard.writeText(pgn || '1. ');
    setCopiedPGN(true);
    setTimeout(() => setCopiedPGN(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#181b20] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-[#14161a]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Move Log
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ({history.length} {history.length === 1 ? 'ply' : 'plies'})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyFEN}
            title="Copy current FEN"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            {copiedFEN ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>FEN</span>
          </button>
          <button
            onClick={handleCopyPGN}
            title="Copy game PGN"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            {copiedPGN ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
            <span>PGN</span>
          </button>
        </div>
      </div>

      {/* Moves Scroll List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-1 text-xs font-mono"
      >
        {movePairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-xs text-center px-4 font-sans">
            <span className="text-slate-400 font-medium">No moves played yet</span>
            <span className="text-[11px] mt-1 text-slate-600">
              White makes the first move.
            </span>
          </div>
        ) : (
          movePairs.map((pair) => {
            const isWhiteActive = currentMoveIndex === pair.whiteIndex;
            const isBlackActive = currentMoveIndex === pair.blackIndex;

            return (
              <div
                key={`move-row-${pair.moveNumber}`}
                className="grid grid-cols-[38px_1fr_1fr] items-center px-2 py-1 rounded hover:bg-slate-800/30 transition-colors"
              >
                <span className="text-slate-500 tabular-nums">
                  {pair.moveNumber}.
                </span>

                {/* White move */}
                <button
                  type="button"
                  onClick={() => onSelectMove?.(pair.whiteIndex)}
                  className={`text-left px-2 py-0.5 rounded transition-colors font-medium truncate ${
                    isWhiteActive
                      ? 'bg-amber-600/30 text-amber-300 font-bold'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {pair.white.san}
                </button>

                {/* Black move */}
                {pair.black ? (
                  <button
                    type="button"
                    onClick={() => onSelectMove?.(pair.blackIndex!)}
                    className={`text-left px-2 py-0.5 rounded transition-colors font-medium truncate ${
                      isBlackActive
                        ? 'bg-amber-600/30 text-amber-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {pair.black.san}
                  </button>
                ) : (
                  <span className="text-slate-600 px-2">...</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
