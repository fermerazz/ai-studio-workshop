import React from 'react';
import { ChessPiece } from './ChessPiece';
import { PieceType, PieceColor } from '../types/chess';

interface CapturedPiecesProps {
  fen: string;
  capturedColor: PieceColor; // Show pieces of this color that were captured
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const INITIAL_PIECES: Record<PieceType, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ fen, capturedColor }) => {
  // Parse pieces currently on the board from FEN
  const boardPart = fen.split(' ')[0] || '';
  const currentWhite: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlack: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  for (const char of boardPart) {
    if (char >= '1' && char <= '8') continue;
    if (char === '/') continue;

    const lower = char.toLowerCase() as PieceType;
    if (char === char.toUpperCase()) {
      currentWhite[lower] = (currentWhite[lower] || 0) + 1;
    } else {
      currentBlack[lower] = (currentBlack[lower] || 0) + 1;
    }
  }

  // Missing black pieces (captured by White)
  const capturedBlack: PieceType[] = [];
  // Missing white pieces (captured by Black)
  const capturedWhite: PieceType[] = [];

  (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((type) => {
    const missingBlack = Math.max(0, INITIAL_PIECES[type] - (currentBlack[type] || 0));
    for (let i = 0; i < missingBlack; i++) {
      capturedBlack.push(type);
    }

    const missingWhite = Math.max(0, INITIAL_PIECES[type] - (currentWhite[type] || 0));
    for (let i = 0; i < missingWhite; i++) {
      capturedWhite.push(type);
    }
  });

  const capturedPieces = capturedColor === 'b' ? capturedBlack : capturedWhite;

  const whiteMaterial = capturedBlack.reduce((sum, t) => sum + PIECE_VALUES[t], 0);
  const blackMaterial = capturedWhite.reduce((sum, t) => sum + PIECE_VALUES[t], 0);

  // Material advantage for the captor:
  // If showing captured black pieces, captor is White: advantage = whiteMaterial - blackMaterial
  // If showing captured white pieces, captor is Black: advantage = blackMaterial - whiteMaterial
  const advantage =
    capturedColor === 'b'
      ? whiteMaterial - blackMaterial
      : blackMaterial - whiteMaterial;

  if (capturedPieces.length === 0 && advantage <= 0) {
    return <div className="h-5" />;
  }

  return (
    <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
      {capturedPieces.map((type, idx) => (
        <div key={`cap-${capturedColor}-${type}-${idx}`} className="w-4 h-4 opacity-85 inline-block -mr-1">
          <ChessPiece type={type} color={capturedColor} size={16} />
        </div>
      ))}
      {advantage > 0 && (
        <span className="text-[11px] font-bold text-amber-400 font-mono ml-2 tabular-nums">
          +{advantage}
        </span>
      )}
    </div>
  );
};
