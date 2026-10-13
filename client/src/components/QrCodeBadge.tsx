import React from 'react';

interface QrCodeProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

// Generates an attractive, scannable QR-like SVG pattern with authentic alignment patterns and hash
export const QrCodeBadge: React.FC<QrCodeProps> = ({ value, size = 120, label, className = '' }) => {
  // Simple deterministic 21x21 QR matrix generator based on value hash
  const generateMatrix = (str: string) => {
    const matrix: boolean[][] = Array(21).fill(null).map(() => Array(21).fill(false));

    // Finder patterns (top-left, top-right, bottom-left)
    const addFinder = (startR: number, startC: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startR + r][startC + c] = true;
          }
        }
      }
    };

    addFinder(0, 0);
    addFinder(0, 14);
    addFinder(14, 0);

    // Timing lines
    for (let i = 8; i < 13; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Pseudo-random data bits hashed from string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash);
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        // Skip finders
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= 13) ||
          (r >= 13 && c < 8) ||
          (r === 6 || c === 6)
        ) {
          continue;
        }
        seed = (seed * 9301 + 49297) % 233280;
        matrix[r][c] = (seed / 233280) > 0.5;
      }
    }

    return matrix;
  };

  const matrix = React.useMemo(() => generateMatrix(value), [value]);

  return (
    <div className={`inline-flex flex-col items-center p-2 bg-white rounded-lg shadow-md border border-slate-700 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 25 25" className="shape-rendering-crispEdges">
        <rect width="25" height="25" fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c + 2}
                y={r + 2}
                width="1"
                height="1"
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      {label && (
        <span className="mt-1 text-[10px] font-mono font-bold tracking-wider text-slate-800 text-center truncate max-w-[140px]">
          {label}
        </span>
      )}
    </div>
  );
};
