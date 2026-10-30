import React from 'react';
import { PieceColor, PieceType } from '../types/chess';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
  size?: number | string;
}

/**
 * High-definition Staunton vector chess pieces with smooth gradients, crisp outlines, and subtle drop shadows.
 */
export const ChessPiece: React.FC<ChessPieceProps> = ({
  type,
  color,
  className = '',
  size = '100%',
}) => {
  const isWhite = color === 'w';

  // Palette:
  // White: warm cream / porcelain gradient with warm charcoal outline
  // Black: rich obsidian graphite gradient with subtle light rim
  const baseFill = isWhite ? 'url(#piece-white-grad)' : 'url(#piece-black-grad)';
  const strokeColor = isWhite ? '#4a3f35' : '#111827';
  const detailColor = isWhite ? '#786c5f' : '#94a3b8';

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={`select-none pointer-events-none drop-shadow-md ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* White Piece Gradient: Warm Ivory */}
        <linearGradient id="piece-white-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8f6f0" />
          <stop offset="100%" stopColor="#e4ded3" />
        </linearGradient>

        {/* Black Piece Gradient: Obsidian Charcoal */}
        <linearGradient id="piece-black-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d4451" />
          <stop offset="40%" stopColor="#222834" />
          <stop offset="100%" stopColor="#151922" />
        </linearGradient>
      </defs>

      {/* PAWN */}
      {type === 'p' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={baseFill}
          />
          {/* Base trim */}
          <path d="M12 39.5h21" stroke={detailColor} strokeWidth="1.2" />
          {/* Subtle highlight ring */}
          <ellipse cx="22.5" cy="11.5" rx="1.5" ry="1" fill={isWhite ? '#ffffff' : '#4b5563'} stroke="none" />
        </g>
      )}

      {/* KNIGHT */}
      {type === 'n' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
            fill={baseFill}
          />
          <path
            d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-4.04 3-6 2.1-2.6 4-4.5 4-6 0-3 6-5.5 6-1"
            fill={baseFill}
          />
          <path
            d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"
            fill={strokeColor}
            stroke={strokeColor}
          />
          <path
            d="M15 15.5c-1 1-3.5 1.5-5 0 0 0-.5 3 2.5 3 2.5 0 3-2 2.5-3z"
            fill={baseFill}
          />
          {/* Mane and snout details */}
          <path d="M24 12c-1.5 2-1 4-1 4" stroke={detailColor} strokeWidth="1" />
          <path d="M28 14c-1 2.5 0 4.5 0 4.5" stroke={detailColor} strokeWidth="1" />
          <path d="M31 17c0 2 1 4 1 4" stroke={detailColor} strokeWidth="1" />
          <path d="M13 39.5h23" stroke={detailColor} strokeWidth="1.2" />
        </g>
      )}

      {/* BISHOP */}
      {type === 'b' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"
            fill={baseFill}
          />
          <path
            d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
            fill={baseFill}
          />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill={baseFill} />
          {/* Cut in the mitre */}
          <path d="M17.5 26h10M15 30h15" stroke={detailColor} strokeWidth="1.2" />
          <path d="M22.5 15.5v5M20 18h5" stroke={strokeColor} strokeWidth="1.2" />
        </g>
      )}

      {/* ROOK */}
      {type === 'r' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14L31 31.5H14zM11 14h23v4H11v-4z"
            fill={baseFill}
          />
          {/* Battlements */}
          <path
            d="M11 9h4v5h5V9h5v5h5V9h4v5H11V9z"
            fill={baseFill}
          />
          <path d="M14 25h17" stroke={detailColor} strokeWidth="1.2" />
          <path d="M12 34.5h21" stroke={detailColor} strokeWidth="1.2" />
        </g>
      )}

      {/* QUEEN */}
      {type === 'q' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Crown Jewels */}
          <circle cx="6" cy="12" r="2" fill={baseFill} />
          <circle cx="14" cy="9" r="2" fill={baseFill} />
          <circle cx="22.5" cy="8" r="2" fill={baseFill} />
          <circle cx="31" cy="9" r="2" fill={baseFill} />
          <circle cx="39" cy="12" r="2" fill={baseFill} />
          {/* Crown Body */}
          <path
            d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 6-7.5-10L16 20l-7-6 2 12z"
            fill={baseFill}
          />
          <path
            d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
            fill={baseFill}
          />
          <path d="M11.5 30c3.5-1 18.5-1 22 0" stroke={detailColor} strokeWidth="1.2" />
          <path d="M12 33.5c3.5-1 17.5-1 21 0" stroke={detailColor} strokeWidth="1.2" />
        </g>
      )}

      {/* KING */}
      {type === 'k' && (
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Royal Cross */}
          <path d="M22.5 6.5v6M19.5 9.5h6" stroke={strokeColor} strokeWidth="1.8" />
          {/* Crown Arches */}
          <path
            d="M22.5 11.5c-4 0-8 2-8 6.5 0 3 2.5 5 4 6.5-3 1.5-6.5 4-6.5 8.5 0 2.5 2 4.5 4 5 4.5 1 10.5 1 15 0 2-.5 4-2.5 4-5 0-4.5-3.5-7-6.5-8.5 1.5-1.5 4-3.5 4-6.5 0-4.5-4-6.5-8-6.5z"
            fill={baseFill}
          />
          <path d="M11.5 37.5h22" stroke={strokeColor} strokeWidth="1.5" />
          <path d="M16 26.5c3-1 10-1 13 0" stroke={detailColor} strokeWidth="1.2" />
          <path d="M15 32c3.5-1 11.5-1 15 0" stroke={detailColor} strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
};
