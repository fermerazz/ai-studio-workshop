import React, { useState, useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { PieceColor, PieceType, BoardTheme } from '../types/chess';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  chess: Chess;
  orientation: PieceColor;
  canMove: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  lastMove?: { from: string; to: string } | null;
  theme?: BoardTheme;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation,
  canMove,
  onMove,
  lastMove,
  theme = 'classic-wood',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Files and ranks based on orientation
  const files = useMemo(
    () => (orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']),
    [orientation]
  );
  const ranks = useMemo(
    () => (orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]),
    [orientation]
  );

  // Calculate legal moves for selected square
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !canMove) return [];
    try {
      const moves = chess.moves({ square: selectedSquare, verbose: true });
      return moves;
    } catch {
      return [];
    }
  }, [chess, selectedSquare, canMove]);

  // King in check square
  const inCheckKingSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return piece.square;
        }
      }
    }
    return null;
  }, [chess]);

  // Theme colors
  const themeStyles = {
    'classic-wood': {
      light: 'bg-[#f0d9b5] text-[#b58863]',
      dark: 'bg-[#b58863] text-[#f0d9b5]',
      border: 'border-[#4a3525] bg-[#3a271a]',
      lastMoveLight: 'bg-[#f6f669]',
      lastMoveDark: 'bg-[#baca2b]',
    },
    'tournament-green': {
      light: 'bg-[#eeeed2] text-[#769656]',
      dark: 'bg-[#769656] text-[#eeeed2]',
      border: 'border-[#1b3323] bg-[#16271c]',
      lastMoveLight: 'bg-[#f7f785]',
      lastMoveDark: 'bg-[#bbcb44]',
    },
    'midnight-slate': {
      light: 'bg-[#cbd5e1] text-[#475569]',
      dark: 'bg-[#475569] text-[#cbd5e1]',
      border: 'border-[#0f172a] bg-[#020617]',
      lastMoveLight: 'bg-[#fde047]',
      lastMoveDark: 'bg-[#ca8a04]',
    },
  }[theme];

  const handleSquareClick = (square: Square) => {
    if (!canMove) return;

    // If we already selected a square and click a legal destination
    if (selectedSquare) {
      const move = legalMovesForSelected.find((m) => m.to === square);
      if (move) {
        executeMove(move.from, move.to);
        return;
      }
    }

    // Otherwise, check if clicking on our own piece to select it
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const executeMove = (from: Square, to: Square) => {
    const piece = chess.get(from);
    const isPawnPromotion =
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && to.endsWith('8')) ||
        (piece.color === 'b' && to.endsWith('1')));

    if (isPawnPromotion) {
      setPendingPromotion({ from, to });
      return;
    }

    onMove({ from, to });
    setSelectedSquare(null);
  };

  const handlePromotionSelect = (promotionPiece: PieceType) => {
    if (!pendingPromotion) return;
    onMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promotionPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!canMove) {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }
    setSelectedSquare(square);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain') as Square;
    if (!sourceSquare) return;

    const moves = chess.moves({ square: sourceSquare, verbose: true });
    const isLegal = moves.some((m) => m.to === targetSquare);

    if (isLegal) {
      executeMove(sourceSquare, targetSquare);
    }
  };

  return (
    <div className="relative inline-block select-none">
      {/* Wooden Outer Bezel */}
      <div
        className={`p-2 sm:p-3 rounded-2xl shadow-2xl border-4 ${themeStyles.border} transition-colors duration-300`}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] md:w-[500px] md:h-[500px] lg:w-[560px] lg:h-[560px] rounded-lg overflow-hidden shadow-inner relative">
          {ranks.map((rank, rankIdx) =>
            files.map((file, fileIdx) => {
              const square = `${file}${rank}` as Square;
              const isDark = (rankIdx + fileIdx) % 2 === 1;
              const piece = chess.get(square);
              const isSelected = selectedSquare === square;
              const isLastMove =
                lastMove && (lastMove.from === square || lastMove.to === square);
              const isCheckKing = inCheckKingSquare === square;

              const legalMove = legalMovesForSelected.find(
                (m) => m.to === square
              );
              const isCaptureTarget = legalMove && Boolean(legalMove.captured);

              // Square background
              let squareBg = isDark ? themeStyles.dark : themeStyles.light;
              if (isLastMove) {
                squareBg = isDark
                  ? themeStyles.lastMoveDark
                  : themeStyles.lastMoveLight;
              }

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, square)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors ${squareBg} ${
                    isSelected ? 'ring-2 ring-inset ring-amber-400' : ''
                  }`}
                >
                  {/* Coordinate letters/numbers on edge squares */}
                  {fileIdx === 0 && (
                    <span className="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-bold opacity-75 font-mono pointer-events-none">
                      {rank}
                    </span>
                  )}
                  {rankIdx === 7 && (
                    <span className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold opacity-75 font-mono pointer-events-none">
                      {file}
                    </span>
                  )}

                  {/* King in check highlight */}
                  {isCheckKing && (
                    <div className="absolute inset-0 bg-red-600/50 rounded-full animate-pulse filter blur-sm pointer-events-none" />
                  )}

                  {/* Piece */}
                  {piece && (
                    <div
                      draggable={canMove && piece.color === chess.turn()}
                      onDragStart={(e) => handleDragStart(e, square)}
                      className={`w-[85%] h-[85%] flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                        isSelected ? 'scale-105' : ''
                      }`}
                    >
                      <ChessPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Legal move destination marker */}
                  {legalMove && !piece && (
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/25 pointer-events-none" />
                  )}

                  {/* Capture ring marker */}
                  {legalMove && (piece || isCaptureTarget) && (
                    <div className="absolute inset-0.5 border-[3px] border-slate-900/30 rounded-full pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-[#181b20] border border-amber-500/50 p-5 rounded-2xl shadow-2xl text-center max-w-[280px]">
            <h3 className="text-sm font-bold text-amber-200 mb-1">
              Promote Your Pawn
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which piece to promote into:
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500/60 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 group-hover:scale-110 transition-transform">
                    <ChessPiece
                      type={pType}
                      color={orientation === 'w' ? 'w' : 'b'}
                      size={40}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium capitalize mt-1">
                    {pType === 'q'
                      ? 'Queen'
                      : pType === 'r'
                      ? 'Rook'
                      : pType === 'b'
                      ? 'Bishop'
                      : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
